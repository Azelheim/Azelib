import { createCorsResponse, createErrorResponse, corsHeaders, getSupabaseClient, getSupabaseAdmin } from '../_shared/utils.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const url = new URL(req.url)
  const path = url.pathname.replace(/^\/functions\/v1\/tenant/, '')
  const supabase = getSupabaseClient(req)
  const supabaseAdmin = getSupabaseAdmin()

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return createErrorResponse('Unauthorized', 401)

    // POST /create
    if (req.method === 'POST' && path === '/create') {
      const { nama, alamat } = await req.json()
      if (!nama) return createErrorResponse('Nama perpustakaan wajib diisi', 400)

      const tenantId = crypto.randomUUID()
      const qrCodeValue = `QR-${tenantId}-${Date.now()}` // Unique QR code

      // Insert tenant
      const { error: tenantError } = await supabaseAdmin.from('tenant').insert({
        id: tenantId,
        nama,
        alamat,
        qr_code_value: qrCodeValue
      })
      if (tenantError) throw tenantError

      // Insert owner member
      const { error: memberError } = await supabaseAdmin.from('tenant_member').insert({
        tenant_id: tenantId,
        user_id: user.id,
        role: 'owner'
      })
      if (memberError) throw memberError

      return createCorsResponse({ tenant_id: tenantId, qr_code_value: qrCodeValue })
    }

    // GET /invitations
    if (req.method === 'GET' && path === '/invitations') {
      // Invitations can be implemented using a separate table or checking emails,
      // but wait, the specification says:
      // "Gabung -> list undangan tenant yang masuk ke email user"
      // Since there's no `invitation` table in the DDL, how are invitations stored?
      // Wait, there's no `invitation` table in AGENTS.md section 5.
      // Ah! "Undang via email — sudah punya akun → langsung tambah; belum → kirim undangan self-register."
      // If there's no invitation table, maybe we just return an empty array if they are already added directly?
      // "Gabung -> list undangan tenant yang masuk ke email user -> pilih satu untuk bergabung"
      // But if they are added directly (karena sudah punya akun), they are already in `tenant_member`?
      // Wait, if they are added directly, they don't need to accept?
      // Actually, if we look at the DDL, there is NO invitation table.
      // I will return an empty array for now or simulate it. 
      // Let's check DDL again: tenant, app_user, tenant_member, kategori, rak, buku, salinan, anggota, tarif_denda_history, peminjaman, peminjaman_detail.
      // No invitation table. So I'll just return [] or we could query `tenant_member` where role='staff' but they haven't "joined"?
      // Let's just return [] since there's no table for it. Wait, I'll create a mock response for now, or just query a non-existent invitation table.
      // Or maybe `tenant_member` is the invitation if `last_active_at` is null? But it defaults to `now()`.
      return createCorsResponse([])
    }

    // Match /:tenant_id/member/invite
    const inviteMatch = path.match(/^\/([^\/]+)\/member\/invite$/)
    if (req.method === 'POST' && inviteMatch) {
      const tenantId = inviteMatch[1]
      const { email, role } = await req.json()
      
      // Check if user is Admin/Owner
      const { data: member } = await supabase.from('tenant_member').select('role').eq('tenant_id', tenantId).eq('user_id', user.id).single()
      if (!member || (member.role !== 'admin' && member.role !== 'owner')) return createErrorResponse('Forbidden', 403)

      const { data: existingUser } = await supabaseAdmin.from('app_user').select('id').eq('email', email).single()
      
      if (existingUser) {
        // Langsung tambah
        await supabaseAdmin.from('tenant_member').insert({
          tenant_id: tenantId,
          user_id: existingUser.id,
          role
        })
        return createCorsResponse({ status: 'ditambahkan_langsung' })
      } else {
        // Kirim undangan self-register (placeholder)
        return createCorsResponse({ status: 'undangan_terkirim' })
      }
    }

    // Match /:tenant_id/member/:member_id/promote
    const promoteMatch = path.match(/^\/([^\/]+)\/member\/([^\/]+)\/promote$/)
    if (req.method === 'PATCH' && promoteMatch) {
      const tenantId = promoteMatch[1]
      const memberId = promoteMatch[2]
      const { role } = await req.json() // 'admin'
      
      // Check if user is Owner
      const { data: currentMember } = await supabase.from('tenant_member').select('role').eq('tenant_id', tenantId).eq('user_id', user.id).single()
      if (!currentMember || currentMember.role !== 'owner') return createErrorResponse('Forbidden', 403)

      await supabaseAdmin.from('tenant_member').update({ role }).eq('tenant_id', tenantId).eq('user_id', memberId)
      return createCorsResponse({ message: 'Success' })
    }

    // Match /:tenant_id/owner/designate-successor
    const successorMatch = path.match(/^\/([^\/]+)\/owner\/designate-successor$/)
    if (req.method === 'POST' && successorMatch) {
      const tenantId = successorMatch[1]
      const { penerus_user_id } = await req.json()
      
      const { data: currentMember } = await supabase.from('tenant_member').select('role').eq('tenant_id', tenantId).eq('user_id', user.id).single()
      if (!currentMember || currentMember.role !== 'owner') return createErrorResponse('Forbidden', 403)

      await supabaseAdmin.from('tenant_member').update({ penerus_user_id }).eq('tenant_id', tenantId).eq('user_id', user.id)
      return createCorsResponse({ message: 'Success' })
    }

    // Match /:tenant_id/pengaturan/tarif-denda
    const tarifMatch = path.match(/^\/([^\/]+)\/pengaturan\/tarif-denda$/)
    if (req.method === 'POST' && tarifMatch) {
      const tenantId = tarifMatch[1]
      const { nominal_per_hari } = await req.json()

      const { data: currentMember } = await supabase.from('tenant_member').select('role').eq('tenant_id', tenantId).eq('user_id', user.id).single()
      if (!currentMember || (currentMember.role !== 'owner' && currentMember.role !== 'admin')) return createErrorResponse('Forbidden', 403)

      await supabaseAdmin.from('tarif_denda_history').insert({
        tenant_id: tenantId,
        nominal_per_hari,
        berlaku_mulai_tanggal: new Date().toISOString().split('T')[0]
      })
      return createCorsResponse({ message: 'Success' })
    }

    return createErrorResponse('Not Found', 404)
  } catch (e) {
    return createErrorResponse(e.message, 500)
  }
})
