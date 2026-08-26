# Azelib — Aplikasi Manajemen Perpustakaan

Aplikasi manajemen perpustakaan multi-tenant, berbasis Expo (React Native) + Supabase Cloud.

---

## 🔒 Catatan Arsitektur & Keamanan Deployment

### 1. Environment Produksi (Supabase Cloud)
* **Backend Produksi:** Menggunakan project terkelola resmi Supabase Cloud (`https://ygppsjbiiufzvyeeudjs.supabase.co`).
* **Autentikasi & RLS:** Keamanan dijamin penuh oleh Row Level Security (RLS) PostgreSQL dan arsitektur token JWT resmi Supabase Cloud.
* **Klien Mobile:** Menggunakan `EXPO_PUBLIC_SUPABASE_ANON_KEY` dengan hak akses terbatas yang dijaga oleh RLS. Kunci `service_role_key` **TIDAK PERNAH** dimasukkan ke dalam kode aplikasi mobile.

### 2. Environment Development Lokal (Supabase CLI / Docker)
* **Target Lokal:** `http://127.0.0.1:15421` adalah instance Docker lokal yang disediakan oleh Supabase CLI murni untuk keperluan pengujian dan eksekusi Edge Functions lokal di komputer pengembang.
* **Peringatan Keamanan Port Lokal:**
  * **JANGAN PERNAH** mengekspos port Docker Supabase lokal (`15421`, `15432`, `15423`, dll) ke internet publik (misalnya via port forwarding, tunneling ngrok publik tanpa auth, atau reverse proxy VPS).
  * Endpoint manajemen internal `/pg/*` (`postgres-meta`) pada instance lokal hanya untuk penggunaan internal developer dan tidak boleh dapat dijangkau dari luar.
  * **JANGAN PERNAH** menggunakan default `JWT_SECRET` bawaan development (`super-secret-jwt-token-with-at-least-32-characters-long`) jika suatu saat mengonfigurasi server self-hosted di lingkungan produksi. Selalu gunakan secret acak entropi tinggi (`openssl rand -base64 48`).

---

## 🚀 Memulai Pengembangan

### Prasyarat
* Node.js >= 18
* npm / npx
* Supabase CLI (opsional, untuk local edge functions)

### Menjalankan Frontend
```bash
cd frontend
npm install
npx expo start
```
