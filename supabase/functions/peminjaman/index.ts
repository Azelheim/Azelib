import { createCorsResponse, createErrorResponse, corsHeaders, getSupabaseClient, getSupabaseAdmin } from '../_shared/utils.ts'

function parseDate(dateStr: string) {
  return new Date(dateStr)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const url = new URL(req.url)
  const path = url.pathname.replace(/^\/functions\/v1\/peminjaman/, '')
  const supabase = getSupabaseClient(req)
  const supabaseAdmin = getSupabaseAdmin()

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return createErrorResponse('Unauthorized', 401)

    // POST /
    if (req.method === 'POST' && (path === '' || path === '/')) {
      const { anggota_id, salinan_ids, jatuh_tempo } = await req.json()

      const { data: anggota } = await supabaseAdmin.from('anggota').select('tenant_id').eq('id', anggota_id).single()
      if (!anggota) return createErrorResponse('Anggota tidak ditemukan', 404)

      const tenant_id = anggota.tenant_id

      // Check batas maksimal peminjaman
      const { data: tenant } = await supabaseAdmin.from('tenant').select('batas_maksimal_peminjaman').eq('id', tenant_id).single()
      const { data: currentLoans } = await supabaseAdmin.from('peminjaman')
        .select('id, peminjaman_detail!inner(salinan_id)')
        .eq('anggota_id', anggota_id)
        .eq('status', 'aktif')

      let currentActiveItems = 0
      currentLoans?.forEach((loan: any) => {
        currentActiveItems += loan.peminjaman_detail.length
      })

      if (currentActiveItems + salinan_ids.length > tenant.batas_maksimal_peminjaman) {
        return createErrorResponse('Melebihi batas maksimal peminjaman', 400)
      }

      // Check salinan availability
      const { data: salinanList } = await supabaseAdmin.from('salinan').select('id, status').in('id', salinan_ids)
      for (const salinan of (salinanList || [])) {
        if (salinan.status !== 'tersedia') {
          return createErrorResponse('Salinan tidak tersedia', 400)
        }
      }

      // Proceed to create peminjaman
      const { data: loan, error: loanError } = await supabaseAdmin.from('peminjaman').insert({
        tenant_id,
        anggota_id,
        jatuh_tempo,
        status: 'aktif',
        dibuat_oleh: user.id
      }).select().single()

      if (loanError) throw loanError

      const details = salinan_ids.map((id: string) => ({
        peminjaman_id: loan.id,
        salinan_id: id
      }))

      await supabaseAdmin.from('peminjaman_detail').insert(details)
      await supabaseAdmin.from('salinan').update({ status: 'dipinjam' }).in('id', salinan_ids)

      return createCorsResponse({ message: 'Peminjaman berhasil dibuat', peminjaman_id: loan.id })
    }

    // PATCH /:id/kembalikan
    const kembaliMatch = path.match(/^\/([^\/]+)\/kembalikan$/)
    if (req.method === 'PATCH' && kembaliMatch) {
      const peminjamanId = kembaliMatch[1]

      const { data: peminjaman } = await supabaseAdmin.from('peminjaman')
        .select('*, peminjaman_detail(salinan_id)')
        .eq('id', peminjamanId).single()

      if (!peminjaman || peminjaman.status !== 'aktif') return createErrorResponse('Peminjaman tidak aktif atau tidak ditemukan', 404)

      const tenantId = peminjaman.tenant_id
      const salinanIds = peminjaman.peminjaman_detail.map((d: any) => d.salinan_id)

      // Calculate fine if overdue
      const jatuhTempo = parseDate(peminjaman.jatuh_tempo)
      const now = new Date()
      // Use just the date part for comparison
      const todayStr = now.toISOString().split('T')[0]
      const today = parseDate(todayStr)

      // If today > jatuhTempo, calculate fine
      // Wait, we just mark it as returned. Denda is recorded if we need it? 
      // The schema doesn't have a specific `denda` column on `peminjaman`. 
      // Actually `biaya_penggantian` is for lost books. 
      // How do we record the fine? We can just calculate and return it, or the frontend asks dashboard?
      // Wait, `peminjaman` table doesn't have `denda` field. 
      // Wait! `DashboardSummary` needs `total_denda_periode`.
      // Let's check `peminjaman` table again in `AGENTS.md`. No `denda` field. 
      // Denda = `SUM(...)` dynamically calculated on reports/dashboard!
      
      await supabaseAdmin.from('peminjaman').update({
        status: 'dikembalikan',
        tanggal_kembali: todayStr
      }).eq('id', peminjamanId)

      await supabaseAdmin.from('salinan').update({ status: 'tersedia' }).in('id', salinanIds)

      return createCorsResponse({ message: 'Dikembalikan' })
    }

    // PATCH /:id/tandai-hilang
    const hilangMatch = path.match(/^\/([^\/]+)\/tandai-hilang$/)
    if (req.method === 'PATCH' && hilangMatch) {
      const peminjamanId = hilangMatch[1]
      const { biaya_penggantian } = await req.json()

      const { data: peminjaman } = await supabaseAdmin.from('peminjaman')
        .select('*, peminjaman_detail(salinan_id)')
        .eq('id', peminjamanId).single()

      if (!peminjaman) return createErrorResponse('Not Found', 404)
      const salinanIds = peminjaman.peminjaman_detail.map((d: any) => d.salinan_id)

      await supabaseAdmin.from('peminjaman').update({
        status: 'hilang',
        biaya_penggantian
      }).eq('id', peminjamanId)

      await supabaseAdmin.from('salinan').update({ status: 'hilang' }).in('id', salinanIds)

      return createCorsResponse({ message: 'Ditandai hilang' })
    }

    return createErrorResponse('Not Found', 404)
  } catch (e) {
    return createErrorResponse(e.message, 500)
  }
})
