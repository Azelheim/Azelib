import { createCorsResponse, createErrorResponse, corsHeaders, getSupabaseClient, getSupabaseAdmin } from '../_shared/utils.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const url = new URL(req.url)
  const path = url.pathname.replace(/^\/functions\/v1\/buku/, '')
  const supabase = getSupabaseClient(req)
  const supabaseAdmin = getSupabaseAdmin()

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return createErrorResponse('Unauthorized', 401)

    // Match /lookup-isbn/:isbn
    const isbnMatch = path.match(/^\/lookup-isbn\/([^\/]+)$/)
    if (req.method === 'GET' && isbnMatch) {
      const isbn = isbnMatch[1]
      try {
        const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`)
        const data = await response.json()
        if (!data.items || data.items.length === 0) {
          return createErrorResponse('ISBN tidak ditemukan, isi manual atau pakai kode lokal', 404)
        }
        
        const volumeInfo = data.items[0].volumeInfo
        return createCorsResponse({
          judul: volumeInfo.title || '',
          penulis: volumeInfo.authors ? volumeInfo.authors.join(', ') : '',
          penerbit: volumeInfo.publisher || '',
          tahun_terbit: volumeInfo.publishedDate ? parseInt(volumeInfo.publishedDate.substring(0, 4)) : null,
          cover_url: volumeInfo.imageLinks?.thumbnail || null
        })
      } catch (e) {
        return createErrorResponse('ISBN tidak ditemukan, isi manual atau pakai kode lokal', 404)
      }
    }

    // Match /:buku_id/salinan/generate
    const generateMatch = path.match(/^\/([^\/]+)\/salinan\/generate$/)
    if (req.method === 'POST' && generateMatch) {
      const bukuId = generateMatch[1]
      const { jumlah_eksemplar } = await req.json()

      const { data: buku, error: bukuError } = await supabaseAdmin.from('buku').select('*').eq('id', bukuId).single()
      if (bukuError || !buku) return createErrorResponse('Buku tidak ditemukan', 404)

      // Get current max nomor_urut
      const { data: salinanData } = await supabaseAdmin.from('salinan').select('nomor_urut').eq('buku_id', bukuId).order('nomor_urut', { ascending: false }).limit(1)
      let currentMax = 0
      if (salinanData && salinanData.length > 0) {
        currentMax = salinanData[0].nomor_urut
      }

      const prefix = buku.isbn || buku.kode_lokal || 'LOK-00000'
      const newSalinan = []

      for (let i = 1; i <= jumlah_eksemplar; i++) {
        const nomorUrut = currentMax + i
        newSalinan.push({
          buku_id: bukuId,
          nomor_urut: nomorUrut,
          kode_eksemplar: `${prefix}-${nomorUrut}`,
          status: 'tersedia'
        })
      }

      const { data: inserted, error: insertError } = await supabaseAdmin.from('salinan').insert(newSalinan).select()
      if (insertError) throw insertError

      return createCorsResponse({
        salinan: inserted.map((s: any) => ({ id: s.id, kode_eksemplar: s.kode_eksemplar }))
      })
    }

    return createErrorResponse('Not Found', 404)
  } catch (e) {
    return createErrorResponse(e.message, 500)
  }
})
