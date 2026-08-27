import { supabase } from '../supabase';

async function invokeFunction(functionName: string, subPath: string = '', options: any = {}) {
  const url = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/${functionName}${subPath}`;
  const { data: { session } } = await supabase.auth.getSession();
  
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session?.access_token || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`
  };

  const response = await fetch(url, {
    method: options.method || 'POST',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(json.error || json.message || response.statusText || 'Function error');
  }
  return json;
}

export const apiClient = {
  auth: {
    selfRegister: async (email: string, password: string) => {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      return data;
    },
    deleteAccount: async () => {
      try {
        return await invokeFunction('auth', '/delete-account', { method: 'DELETE' });
      } catch {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Unauthorized');

        // Delete user's tenant memberships & owned tenants if any
        const { data: memberships } = await supabase
          .from('tenant_member')
          .select('tenant_id, role')
          .eq('user_id', user.id);

        if (memberships && memberships.length > 0) {
          const owned = memberships.filter((m: any) => m.role === 'owner');
          for (const o of owned) {
            await supabase.from('tenant').delete().eq('id', o.tenant_id);
          }
        }

        await supabase.from('tenant_member').delete().eq('user_id', user.id);
        await supabase.from('app_user').delete().eq('id', user.id);
        await supabase.auth.signOut();
        return { success: true };
      }
    }
  },
  tenant: {
    create: async (nama: string, alamat: string) => {
      try {
        return await invokeFunction('tenant', '/create', { body: { nama, alamat } });
      } catch (err: any) {
        if (err.message?.includes('Requested function was not found') || err.message?.includes('404') || err.message?.includes('Function error')) {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error('Unauthorized');
          
          // Ensure app_user exists
          await supabase.from('app_user').upsert({
            id: user.id,
            email: user.email || '',
            nama: user.user_metadata?.nama || user.email?.split('@')[0] || 'User'
          });

          const qrCodeValue = `QR-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
          
          const { data: tenant, error: tenantErr } = await supabase.from('tenant').insert({
            nama,
            alamat,
            qr_code_value: qrCodeValue
          }).select().single();
          if (tenantErr) throw tenantErr;

          const { error: memberErr } = await supabase.from('tenant_member').insert({
            tenant_id: tenant.id,
            user_id: user.id,
            role: 'owner'
          });
          if (memberErr) throw memberErr;

          // Default tarif denda
          await supabase.from('tarif_denda_history').insert({
            tenant_id: tenant.id,
            nominal_per_hari: 500
          });

          return { tenant_id: tenant.id, qr_code_value: qrCodeValue };
        }
        throw err;
      }
    },
    invitations: async () => {
      try {
        const res = await invokeFunction('tenant', '/invitations', { method: 'GET' });
        if (Array.isArray(res) && res.length > 0) return res;
      } catch {}

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('tenant_member')
        .select('tenant_id, role, tenant:tenant_id(id, nama, alamat)')
        .eq('user_id', user.id);

      if (error || !data) return [];
      return data.map((item: any) => ({
        tenant_id: item.tenant_id,
        nama_tenant: item.tenant?.nama || 'Perpustakaan',
        role_ditawarkan: item.role,
      }));
    },
    memberInvite: async (tenant_id: string, email: string, role: string, actor_role: string = 'owner') => {
      if (actor_role === 'staff') {
        throw new Error('Hanya Owner dan Admin yang dapat mengundang anggota');
      }
      try {
        return await invokeFunction('tenant', `/${tenant_id}/member/invite`, { body: { email, role } });
      } catch (err: any) {
        if (err.message?.includes('Requested function was not found') || err.message?.includes('404') || err.message?.includes('Function error')) {
          const { data: user } = await supabase.from('app_user').select('id').eq('email', email).single();
          if (user) {
            await supabase.from('tenant_member').insert({
              tenant_id,
              user_id: user.id,
              role
            });
            return { status: 'ditambahkan_langsung' };
          }
          return { status: 'undangan_terkirim' };
        }
        throw err;
      }
    },
    memberPromote: async (tenant_id: string, member_id: string, role: string, actor_role: string = 'owner') => {
      if (actor_role !== 'owner') {
        throw new Error('Hanya Owner yang dapat mengubah role pengelola');
      }
      try {
        return await invokeFunction('tenant', `/${tenant_id}/member/${member_id}/promote`, { method: 'PATCH', body: { role } });
      } catch (err: any) {
        if (err.message?.includes('Requested function was not found') || err.message?.includes('404') || err.message?.includes('Function error')) {
          const { error } = await supabase.from('tenant_member').update({ role }).eq('id', member_id);
          if (error) throw error;
          return { status: 'success' };
        }
        throw err;
      }
    },
    memberRemove: async (tenant_id: string, member_id: string, actor_role: string = 'owner', target_role: string = 'staff') => {
      if (actor_role === 'staff') {
        throw new Error('Hanya Owner dan Admin yang dapat mengeluarkan anggota');
      }
      if (target_role === 'owner') {
        throw new Error('Owner tidak dapat dikeluarkan');
      }
      if (actor_role === 'admin' && target_role === 'admin') {
        throw new Error('Hanya Owner yang dapat mengeluarkan Admin');
      }
      try {
        return await invokeFunction('tenant', `/${tenant_id}/member/${member_id}`, { method: 'DELETE' });
      } catch (err: any) {
        if (err.message?.includes('Requested function was not found') || err.message?.includes('404') || err.message?.includes('Function error')) {
          const { error } = await supabase.from('tenant_member').delete().eq('id', member_id);
          if (error) throw error;
          return { status: 'success' };
        }
        throw err;
      }
    },
    getByQr: async (qr_code_value: string) => {
      let raw = (qr_code_value || '').trim();
      console.log('[BARCODE-007][VALIDATE-START] Validating input code:', { raw, input: qr_code_value });
      if (!raw) {
        throw new Error('QR tidak dikenali, coba lagi');
      }

      // 1. Extract payload from JSON or Deep Link / URL if present
      if (raw.startsWith('{') && raw.endsWith('}')) {
        try {
          const parsed = JSON.parse(raw);
          raw = parsed.qr_code_value || parsed.tenant_id || parsed.id || raw;
          console.log('[BARCODE-007][VALIDATE-PARSED-JSON] Extracted from JSON:', raw);
        } catch {}
      } else if (raw.includes('://') || raw.includes('?')) {
        try {
          const url = new URL(raw);
          const codeParam = url.searchParams.get('code') || url.searchParams.get('qr') || url.searchParams.get('tenant_id');
          if (codeParam) {
            raw = codeParam;
          } else {
            const segments = url.pathname.split('/').filter(Boolean);
            if (segments.length > 0) raw = segments[segments.length - 1];
          }
          console.log('[BARCODE-007][VALIDATE-PARSED-URL] Extracted from URL:', raw);
        } catch {
          const match = raw.match(/[?&](code|qr|tenant_id)=([^&]+)/);
          if (match && match[2]) {
            raw = decodeURIComponent(match[2]);
            console.log('[BARCODE-007][VALIDATE-PARSED-REGEX] Extracted from regex:', raw);
          }
        }
      }

      const cleanCode = raw.trim();
      const upperCode = cleanCode.toUpperCase();
      console.log('[BARCODE-007][VALIDATE-TARGET-CODE] Target code for DB matching:', { cleanCode, upperCode });

      // 2. Query Supabase with single source of truth (active qr_code_value)
      try {
        // Strategy A: Exact qr_code_value match (case-insensitive) in database
        console.log('[BARCODE-007][VALIDATE-STRATEGY-A] Attempting ilike query for qr_code_value:', cleanCode);
        const { data: byQr, error: errQr } = await supabase
          .from('tenant')
          .select('id, nama, alamat, qr_code_value')
          .ilike('qr_code_value', cleanCode);

        console.log('[BARCODE-007][VALIDATE-STRATEGY-A-RESULT]', { count: byQr?.length, byQr, errQr });
        if (!errQr && byQr && byQr.length > 0) {
          console.log('[BARCODE-007][VALIDATE-MATCH-FOUND] Strategy A matched tenant:', byQr[0]);
          return byQr[0];
        }

        // Strategy B: Match by UUID if input is valid UUID
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (uuidRegex.test(cleanCode)) {
          console.log('[BARCODE-007][VALIDATE-STRATEGY-B] Code is UUID, querying tenant by ID:', cleanCode);
          const { data: byId, error: errId } = await supabase
            .from('tenant')
            .select('id, nama, alamat, qr_code_value')
            .eq('id', cleanCode)
            .single();
          console.log('[BARCODE-007][VALIDATE-STRATEGY-B-RESULT]', { byId, errId });
          if (!errId && byId) return byId;
        }

        // Strategy C: Fetch all tenants to check in-memory match & legacy fallback
        console.log('[BARCODE-007][VALIDATE-STRATEGY-C] Fetching all tenants from server for in-memory check...');
        const { data: allTenants, error: allErr } = await supabase
          .from('tenant')
          .select('id, nama, alamat, qr_code_value');

        console.log('[BARCODE-007][VALIDATE-STRATEGY-C-SERVER-VALUES]', 
          allTenants?.map(t => ({ id: t.id, nama: t.nama, server_qr_code_value: t.qr_code_value }))
        );

        if (!allErr && Array.isArray(allTenants)) {
          // Direct match against active server qr_code_value
          const foundDirect = allTenants.find(t => 
            t.qr_code_value && t.qr_code_value.trim().toUpperCase() === upperCode
          );
          if (foundDirect) {
            console.log('[BARCODE-007][VALIDATE-MATCH-FOUND] Strategy C direct matched tenant:', foundDirect);
            return foundDirect;
          }

          // Legacy fallback ONLY for tenants with NO active qr_code_value set in DB
          const foundLegacy = allTenants.find(t => {
            if (t.qr_code_value) return false; // If tenant has active qr_code_value, old/legacy codes must be rejected
            const cleanName = (t.nama || 'LIB').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
            const expectedPattern = `QR-${cleanName || 'PERPUS'}-${(t.id || '').slice(0, 6).toUpperCase()}`;
            return expectedPattern === upperCode;
          });
          if (foundLegacy) {
            console.log('[BARCODE-007][VALIDATE-MATCH-FOUND] Strategy C legacy matched tenant (no active QR in DB):', foundLegacy);
            return foundLegacy;
          }
        }
      } catch (e) {
        console.error('[BARCODE-007][VALIDATE-ERROR] Error in getByQr:', e);
      }

      console.warn('[BARCODE-007][VALIDATE-FAIL] No tenant matched code:', { cleanCode, upperCode });
      // If no strategy matched, throw standardized error
      throw new Error('Token tidak dikenali, coba lagi');
    },
    getByToken: async (token: string) => {
      const raw = (token || '').trim();
      if (!raw) {
        throw new Error('Token tidak dikenali, coba lagi');
      }
      try {
        return await apiClient.tenant.getByQr(raw);
      } catch {
        throw new Error('Token tidak dikenali, coba lagi');
      }
    },
    refreshToken: async (tenantId: string, actor_role: string) => {
      if (actor_role !== 'owner' && actor_role !== 'admin') {
        throw new Error('Hanya Owner dan Admin yang dapat memperbarui token');
      }
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let newToken = '';
      for (let i = 0; i < 6; i++) {
        newToken += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      const { data, error } = await supabase
        .from('tenant')
        .update({ qr_code_value: newToken, updated_at: new Date().toISOString() })
        .eq('id', tenantId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    ownerDesignateSuccessor: async (tenant_id: string, penerus_user_id: string) => {
      try {
        return await invokeFunction('tenant', `/${tenant_id}/owner/designate-successor`, { body: { penerus_user_id } });
      } catch (err: any) {
        if (err.message?.includes('Requested function was not found') || err.message?.includes('404') || err.message?.includes('Function error')) {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase.from('tenant_member').update({ penerus_user_id }).eq('tenant_id', tenant_id).eq('user_id', user.id);
          }
          return { status: 'success' };
        }
        throw err;
      }
    },
    pengaturanTarifDenda: async (tenant_id: string, nominal_per_hari: number) => {
      try {
        return await invokeFunction('tenant', `/${tenant_id}/pengaturan/tarif-denda`, { body: { nominal_per_hari } });
      } catch (err: any) {
        if (err.message?.includes('Requested function was not found') || err.message?.includes('404') || err.message?.includes('Function error')) {
          const { error } = await supabase.from('tarif_denda_history').insert({
            tenant_id,
            nominal_per_hari
          });
          if (error) throw error;
          return { status: 'success' };
        }
        throw err;
      }
    }
  },
  buku: {
    lookupIsbn: async (isbn: string) => {
      try {
        return await invokeFunction('buku', `/lookup-isbn?isbn=${isbn}`, { method: 'GET' });
      } catch {
        try {
          const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`);
          const data = await res.json();
          if (data.items && data.items.length > 0) {
            const info = data.items[0].volumeInfo;
            return {
              judul: info.title || '',
              penulis: info.authors ? info.authors.join(', ') : '',
              penerbit: info.publisher || '',
              tahun_terbit: info.publishedDate ? parseInt(info.publishedDate.substring(0, 4)) : null,
              cover_url: info.imageLinks?.thumbnail || null
            };
          }
        } catch {}
        throw new Error('ISBN tidak ditemukan, isi manual atau pakai kode lokal');
      }
    },
    salinanGenerate: async (buku_id: string, jumlah_eksemplar: number) => {
      if (jumlah_eksemplar <= 0) return { salinan: [] };
      try {
        return await invokeFunction('buku', `/${buku_id}/salinan/generate`, { body: { jumlah_eksemplar } });
      } catch (err: any) {
        // Fallback directly to Supabase
        const { data: buku, error: bukuError } = await supabase
          .from('buku')
          .select('isbn, kode_lokal')
          .eq('id', buku_id)
          .single();
        if (bukuError || !buku) throw new Error('Buku tidak ditemukan');

        const prefix = buku.isbn || buku.kode_lokal || 'LOK-00001';

        // Get max nomor_urut for this specific book
        const { data: maxSalinan } = await supabase
          .from('salinan')
          .select('nomor_urut')
          .eq('buku_id', buku_id)
          .order('nomor_urut', { ascending: false })
          .limit(1);

        const currentMax = (maxSalinan && maxSalinan.length > 0) ? maxSalinan[0].nomor_urut : 0;

        const newSalinanList = [];
        for (let i = 1; i <= jumlah_eksemplar; i++) {
          const nomorUrut = currentMax + i;
          const kodeEksemplar = `${prefix}-${nomorUrut}`;
          newSalinanList.push({
            buku_id,
            nomor_urut: nomorUrut,
            kode_eksemplar: kodeEksemplar,
            status: 'tersedia' as const,
          });
        }

        const { data: inserted, error: insertError } = await supabase
          .from('salinan')
          .insert(newSalinanList)
          .select('id, kode_eksemplar');

        if (insertError) throw insertError;
        return { salinan: inserted || [] };
      }
    }
  },
  peminjaman: {
    create: async (anggota_id: string, salinan_ids: string[], jatuh_tempo: string, tenant_id?: string) => {
      try {
        return await invokeFunction('peminjaman', '', { body: { anggota_id, salinan_ids, jatuh_tempo } });
      } catch (err: any) {
        if (err.message?.includes('Requested function was not found') || err.message?.includes('404') || err.message?.includes('Function error')) {
          let tId = tenant_id;
          if (!tId) {
            const { data: anggota } = await supabase.from('anggota').select('tenant_id').eq('id', anggota_id).single();
            tId = anggota?.tenant_id;
          }
          const { data: pinjam, error: pinjamErr } = await supabase.from('peminjaman').insert({
            tenant_id: tId,
            anggota_id,
            jatuh_tempo,
            status: 'aktif'
          }).select().single();
          if (pinjamErr) throw pinjamErr;

          for (const salinanId of salinan_ids) {
            await supabase.from('peminjaman_detail').insert({
              peminjaman_id: pinjam.id,
              salinan_id: salinanId
            });
            await supabase.from('salinan').update({ status: 'dipinjam' }).eq('id', salinanId);
          }
          return { id: pinjam.id, message: 'Peminjaman berhasil dibuat' };
        }
        throw err;
      }
    },
    kembalikan: async (id: string) => {
      try {
        return await invokeFunction('peminjaman', `/${id}/kembalikan`, { method: 'POST' });
      } catch (err: any) {
        if (err.message?.includes('Requested function was not found') || err.message?.includes('404') || err.message?.includes('Function error')) {
          const today = new Date().toISOString().split('T')[0];
          await supabase.from('peminjaman').update({
            status: 'dikembalikan',
            tanggal_kembali: today
          }).eq('id', id);

          const { data: details } = await supabase.from('peminjaman_detail').select('salinan_id').eq('peminjaman_id', id);
          if (details) {
            for (const d of details) {
              await supabase.from('salinan').update({ status: 'tersedia' }).eq('id', d.salinan_id);
            }
          }
          return { message: 'Berhasil dikembalikan' };
        }
        throw err;
      }
    },
    tandaiHilang: async (id: string, biaya_penggantian: number) => {
      try {
        return await invokeFunction('peminjaman', `/${id}/tandai-hilang`, { body: { biaya_penggantian } });
      } catch (err: any) {
        if (err.message?.includes('Requested function was not found') || err.message?.includes('404') || err.message?.includes('Function error')) {
          await supabase.from('peminjaman').update({
            status: 'hilang',
            biaya_penggantian
          }).eq('id', id);

          const { data: details } = await supabase.from('peminjaman_detail').select('salinan_id').eq('peminjaman_id', id);
          if (details) {
            for (const d of details) {
              await supabase.from('salinan').update({ status: 'hilang' }).eq('id', d.salinan_id);
            }
          }
          return { message: 'Ditandai hilang' };
        }
        throw err;
      }
    }
  },
  dashboard: {
    summary: async (tenant_id: string) => {
      try {
        return await invokeFunction('dashboard', `/${tenant_id}/summary`, { method: 'GET' });
      } catch {
        const today = new Date().toISOString().split('T')[0];
        const [booksRes, activeLoansRes, terlambatRes, tarifRes, allLoansRes] = await Promise.all([
          supabase.from('buku').select('id, salinan(id)').eq('tenant_id', tenant_id).eq('dihapus', false),
          supabase.from('peminjaman').select('id, anggota_id, peminjaman_detail(salinan_id)').eq('tenant_id', tenant_id).eq('status', 'aktif'),
          supabase.from('peminjaman').select('id', { count: 'exact', head: true }).eq('tenant_id', tenant_id).eq('status', 'aktif').lt('jatuh_tempo', today),
          supabase.from('tarif_denda_history').select('nominal_per_hari').eq('tenant_id', tenant_id).order('berlaku_mulai_tanggal', { ascending: false }).limit(1).single(),
          supabase.from('peminjaman').select('id, tanggal_pinjam, jatuh_tempo, tanggal_kembali, status').eq('tenant_id', tenant_id),
        ]);

        const validBooks = (booksRes.data || []).filter((b: any) => b.salinan && b.salinan.length > 0);
        let total_copies = 0;
        validBooks.forEach((b: any) => {
          total_copies += b.salinan.length;
        });

        const jumlah_buku = total_copies;
        const jumlah_judul = validBooks.length;
        const peminjam_aktif = new Set((activeLoansRes.data || []).map((l: any) => l.anggota_id)).size;
        let buku_dipinjam = 0;
        (activeLoansRes.data || []).forEach((l: any) => {
          buku_dipinjam += (l.peminjaman_detail || []).length;
        });
        const buku_terlambat = terlambatRes.count || 0;

        const tarif = tarifRes.data?.nominal_per_hari || 500;
        let total_denda_periode = 0;
        (allLoansRes.data || []).forEach((loan: any) => {
          if (loan.status === 'aktif' && loan.jatuh_tempo < today) {
            const daysLate = Math.max(0, Math.floor((new Date(today).getTime() - new Date(loan.jatuh_tempo).getTime()) / (1000 * 60 * 60 * 24)));
            total_denda_periode += daysLate * Number(tarif);
          }
        });

        return {
          jumlah_buku,
          jumlah_judul,
          peminjam_aktif,
          buku_dipinjam,
          buku_terlambat,
          total_denda_periode,
        };
      }
    }
  },
  laporan: {
    export: async (tenant_id: string, jenis: string, dari_tanggal: string, sampai_tanggal: string) => {
      return invokeFunction('laporan', `/${tenant_id}/export`, { body: { jenis, dari_tanggal, sampai_tanggal } });
    }
  },
  katalog: {
    getBooks: async (tenant_id: string) => {
      let query = supabase
        .from('buku')
        .select('id, judul, penulis, sinopsis, kategori:kategori_id(nama), rak:rak_id(nama), salinan(status)')
        .eq('dihapus', false);
      if (tenant_id) {
        query = query.eq('tenant_id', tenant_id);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    }
  }
};
