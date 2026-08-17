import { createCorsResponse, createErrorResponse, corsHeaders, getSupabaseClient, getSupabaseAdmin } from '../_shared/utils.ts'
import { calculateDenda } from '../_shared/denda.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const url = new URL(req.url)
  const path = url.pathname.replace(/^\/functions\/v1\/dashboard/, '')
  const supabase = getSupabaseClient(req)
  const supabaseAdmin = getSupabaseAdmin()

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return createErrorResponse('Unauthorized', 401)

    // GET /:tenant_id/summary
    const summaryMatch = path.match(/^\/([^\/]+)\/summary$/)
    if (req.method === 'GET' && summaryMatch) {
      const tenantId = summaryMatch[1]

      const { data: member } = await supabase.from('tenant_member').select('role').eq('tenant_id', tenantId).eq('user_id', user.id).single()
      if (!member) return createErrorResponse('Forbidden', 403)

      const todayStr = new Date().toISOString().split('T')[0]

      // jumlah_buku (undeleted)
      const { count: jumlah_buku } = await supabaseAdmin.from('buku')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId).eq('dihapus', false)

      // peminjam_aktif (distinct members with active loans)
      const { data: activeLoans } = await supabaseAdmin.from('peminjaman')
        .select('anggota_id')
        .eq('tenant_id', tenantId)
        .eq('status', 'aktif')
      const peminjam_aktif = new Set((activeLoans || []).map(l => l.anggota_id)).size

      // buku_dipinjam (salinan where status='dipinjam')
      const { data: dipinjamData } = await supabaseAdmin.from('peminjaman')
        .select('peminjaman_detail(salinan_id)')
        .eq('tenant_id', tenantId)
        .eq('status', 'aktif')
      let buku_dipinjam = 0
      dipinjamData?.forEach((loan: any) => {
        buku_dipinjam += loan.peminjaman_detail.length
      })

      // buku_terlambat (active loans where jatuh_tempo < today)
      // "buku_terlambat = COUNT(peminjaman) WHERE status='aktif' AND jatuh_tempo < CURRENT_DATE"
      const { data: terlambatData } = await supabaseAdmin.from('peminjaman')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('status', 'aktif')
        .lt('jatuh_tempo', todayStr)
      const buku_terlambat = terlambatData?.length || 0

      // total_denda_periode
      // Calculate total fines for active and returned loans in this period? 
      // The spec doesn't say which period. Usually month to date or all. 
      // I'll calculate total fines for all late loans.
      const { data: allLateLoans } = await supabaseAdmin.from('peminjaman')
        .select('jatuh_tempo, tanggal_kembali')
        .eq('tenant_id', tenantId)
        .or(`status.eq.aktif,status.eq.dikembalikan`)
      
      const { data: tarifHistory } = await supabaseAdmin.from('tarif_denda_history')
        .select('*')
        .eq('tenant_id', tenantId)

      let total_denda_periode = 0
      if (allLateLoans && tarifHistory) {
        for (const loan of allLateLoans) {
          total_denda_periode += calculateDenda(loan.jatuh_tempo, loan.tanggal_kembali, tarifHistory, todayStr)
        }
      }

      return createCorsResponse({
        jumlah_buku: jumlah_buku || 0,
        peminjam_aktif,
        buku_dipinjam,
        buku_terlambat,
        chart_tren: { buku: [], peminjam: [], denda: [] }, // Mocked for now
        total_denda_periode
      })
    }

    return createErrorResponse('Not Found', 404)
  } catch (e) {
    return createErrorResponse(e.message, 500)
  }
})
