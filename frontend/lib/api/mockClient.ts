import { supabase } from '../supabase';

export const mockClient = {
  auth: {
    selfRegister: async (email: string, password: string) => {
      const { data, error } = await supabase.functions.invoke('auth/self-register', {
        body: { email, password }
      });
      if (error) throw new Error(error.message || 'Gagal mendaftar');
      if (data?.error) throw new Error(data.error);
      return data;
    }
  },
  tenant: {
    create: async (nama: string, alamat: string) => {
      const { data, error } = await supabase.functions.invoke('tenant/create', {
        body: { nama, alamat }
      });
      if (error) throw new Error(error.message || 'Gagal membuat perpustakaan');
      if (data?.error) throw new Error(data.error);
      return data;
    },
    invitations: async () => {
      const { data, error } = await supabase.functions.invoke('tenant/invitations', {
        method: 'GET'
      });
      if (error) throw new Error(error.message || 'Gagal mengambil undangan');
      if (data?.error) throw new Error(data.error);
      return data;
    },
    memberInvite: async (tenant_id: string, email: string, role: string) => {
      const { data, error } = await supabase.functions.invoke(`tenant/${tenant_id}/member/invite`, {
        body: { email, role }
      });
      if (error) throw new Error(error.message || 'Gagal mengundang anggota');
      if (data?.error) throw new Error(data.error);
      return data;
    },
    memberPromote: async (tenant_id: string, member_id: string, role: string) => {
      const { data, error } = await supabase.functions.invoke(`tenant/${tenant_id}/member/${member_id}/promote`, {
        method: 'PATCH',
        body: { role }
      });
      if (error) throw new Error(error.message || 'Gagal mengubah peran anggota');
      if (data?.error) throw new Error(data.error);
      return data;
    },
    ownerDesignateSuccessor: async (tenant_id: string, penerus_user_id: string) => {
      const { data, error } = await supabase.functions.invoke(`tenant/${tenant_id}/owner/designate-successor`, {
        body: { penerus_user_id }
      });
      if (error) throw new Error(error.message || 'Gagal menunjuk penerus');
      if (data?.error) throw new Error(data.error);
      return data;
    },
    pengaturanTarifDenda: async (tenant_id: string, nominal_per_hari: number) => {
      const { data, error } = await supabase.functions.invoke(`tenant/${tenant_id}/pengaturan/tarif-denda`, {
        body: { nominal_per_hari }
      });
      if (error) throw new Error(error.message || 'Gagal mengatur tarif denda');
      if (data?.error) throw new Error(data.error);
      return data;
    }
  },
  buku: {
    lookupIsbn: async (isbn: string) => {
      const { data, error } = await supabase.functions.invoke(`buku/lookup-isbn/${isbn}`, {
        method: 'GET'
      });
      if (error) throw new Error(error.message || 'Gagal mencari ISBN');
      if (data?.error) throw new Error(data.error);
      return data;
    },
    salinanGenerate: async (buku_id: string, jumlah_eksemplar: number) => {
      const { data, error } = await supabase.functions.invoke(`buku/${buku_id}/salinan/generate`, {
        body: { jumlah_eksemplar }
      });
      if (error) throw new Error(error.message || 'Gagal membuat salinan');
      if (data?.error) throw new Error(data.error);
      return data;
    }
  },
  peminjaman: {
    create: async (anggota_id: string, salinan_ids: string[], jatuh_tempo: string) => {
      const { data, error } = await supabase.functions.invoke('peminjaman', {
        body: { anggota_id, salinan_ids, jatuh_tempo }
      });
      if (error) throw new Error(error.message || 'Gagal meminjam buku');
      if (data?.error) throw new Error(data.error);
      return data;
    },
    kembalikan: async (id: string) => {
      const { data, error } = await supabase.functions.invoke(`peminjaman/${id}/kembalikan`, {
        method: 'PATCH'
      });
      if (error) throw new Error(error.message || 'Gagal mengembalikan buku');
      if (data?.error) throw new Error(data.error);
      return data;
    },
    tandaiHilang: async (id: string, biaya_penggantian: number) => {
      const { data, error } = await supabase.functions.invoke(`peminjaman/${id}/tandai-hilang`, {
        method: 'PATCH',
        body: { biaya_penggantian }
      });
      if (error) throw new Error(error.message || 'Gagal menandai hilang');
      if (data?.error) throw new Error(data.error);
      return data;
    }
  },
  dashboard: {
    summary: async (tenant_id: string) => {
      const { data, error } = await supabase.functions.invoke(`dashboard/${tenant_id}/summary`, {
        method: 'GET'
      });
      if (error) throw new Error(error.message || 'Gagal mengambil dashboard summary');
      if (data?.error) throw new Error(data.error);
      return data;
    }
  },
  laporan: {
    export: async (tenant_id: string, jenis: string, dari_tanggal: string, sampai_tanggal: string) => {
      const params = new URLSearchParams({ jenis, dari_tanggal, sampai_tanggal });
      const { data, error } = await supabase.functions.invoke(`laporan/${tenant_id}/export?${params.toString()}`, {
        method: 'GET'
      });
      if (error) throw new Error(error.message || 'Gagal export laporan');
      if (data?.error) throw new Error(data.error);
      return data;
    }
  }
};
