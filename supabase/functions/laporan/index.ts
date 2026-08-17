import { createCorsResponse, createErrorResponse, corsHeaders, getSupabaseClient } from '../_shared/utils.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const url = new URL(req.url)
  const path = url.pathname.replace(/^\/functions\/v1\/laporan/, '')
  const supabase = getSupabaseClient(req)

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return createErrorResponse('Unauthorized', 401)

    // GET /:tenant_id/export
    const exportMatch = path.match(/^\/([^\/]+)\/export$/)
    if (req.method === 'GET' && exportMatch) {
      const tenantId = exportMatch[1]
      
      const { data: member } = await supabase.from('tenant_member').select('role').eq('tenant_id', tenantId).eq('user_id', user.id).single()
      if (!member) return createErrorResponse('Forbidden', 403)

      const jenis = url.searchParams.get('jenis')
      const dari_tanggal = url.searchParams.get('dari_tanggal')
      const sampai_tanggal = url.searchParams.get('sampai_tanggal')

      if (!jenis || !['peminjaman', 'denda', 'buku'].includes(jenis)) {
        return createErrorResponse('Jenis laporan tidak valid', 400)
      }

      // Placeholder for actual PDF generation logic.
      // Can be connected to a real PDF generation service like pdf-lib or returned directly.
      const mockFileUrl = `https://example.com/reports/${tenantId}/${jenis}_${dari_tanggal}_${sampai_tanggal}.pdf`

      return createCorsResponse({ file_url: mockFileUrl })
    }

    return createErrorResponse('Not Found', 404)
  } catch (e) {
    return createErrorResponse(e.message, 500)
  }
})
