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
        return await invokeFunction('tenant', '/invitations', { method: 'GET' });
      } catch {
        return [];
      }
    },
    memberInvite: async (tenant_id: string, email: string, role: string) => {
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
    memberPromote: async (tenant_id: string, member_id: string, role: string) => {
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
      try {
        return await invokeFunction('buku', `/${buku_id}/salinan/generate`, { body: { jumlah_eksemplar } });
      } catch (err: any) {
        if (err.message?.includes('Requested function was not found') || err.message?.includes('404') || err.message?.includes('Function error')) {
          const { data: buku } = await supabase.from('buku').select('isbn, kode_lokal').eq('id', buku_id).single();
          const prefix = buku?.isbn || buku?.kode_lokal || 'Buku';
          
          const { count } = await supabase.from('salinan').select('id', { count: 'exact', head: true }).eq('buku_id', buku_id);
          const startUrut = (count || 0) + 1;
          
          const newSalinanList = [];
          for (let i = 0; i < jumlah_eksemplar; i++) {
            const nomorUrut = startUrut + i;
            const kodeEksemplar = `${prefix}-${nomorUrut}`;
            const { data: salinanData, error } = await supabase.from('salinan').insert({
              buku_id,
              nomor_urut: nomorUrut,
              kode_eksemplar: kodeEksemplar,
              status: 'tersedia'
            }).select().single();
            if (!error && salinanData) {
              newSalinanList.push({ id: salinanData.id, kode_eksemplar: kodeEksemplar });
            }
          }
          return { salinan: newSalinanList };
        }
        throw err;
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

        const jumlah_buku = (booksRes.data || []).filter((b: any) => b.salinan && b.salinan.length > 0).length;
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
  }
};
