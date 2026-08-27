import { createCorsResponse, createErrorResponse, corsHeaders, getSupabaseClient, getSupabaseAdmin } from '../_shared/utils.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const url = new URL(req.url)
  const path = url.pathname.replace(/^\/functions\/v1\/auth/, '')

  if (req.method === 'POST' && path === '/self-register') {
    try {
      const { email, password } = await req.json()

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!email || !emailRegex.test(email)) {
        return createErrorResponse('Format email tidak valid', 400)
      }

      // Validate password (min 8 char, letters and numbers)
      const hasLetters = /[a-zA-Z]/.test(password)
      const hasNumbers = /\d/.test(password)
      if (!password || password.length < 8 || !hasLetters || !hasNumbers) {
        return createErrorResponse('Password minimal 8 karakter, kombinasi huruf dan angka', 400)
      }

      const supabaseAdmin = getSupabaseAdmin()

      const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers()
      if (listError) throw listError
      
      const emailExists = existingUsers.users.some(u => u.email === email)
      if (emailExists) {
        return createErrorResponse('Email sudah terdaftar', 409)
      }

      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true
      })

      if (authError) {
        return createErrorResponse(authError.message, 400)
      }

      const userId = authData.user.id

      // Insert into app_user
      const { error: dbError } = await supabaseAdmin
        .from('app_user')
        .insert({ id: userId, email })

      if (dbError) {
        // cleanup auth user if db fails
        await supabaseAdmin.auth.admin.deleteUser(userId)
        return createErrorResponse(dbError.message, 500)
      }

      return createCorsResponse({
        user_id: userId,
        message: 'Akun berhasil dibuat'
      })
    } catch (e: any) {
      return createErrorResponse(e.message, 500)
    }
  }

  if (req.method === 'DELETE' && path === '/delete-account') {
    try {
      const supabase = getSupabaseClient(req)
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) return createErrorResponse('Unauthorized', 401)

      const supabaseAdmin = getSupabaseAdmin()
      const userId = user.id

      // 1. Find all tenants owned by this user
      const { data: memberships } = await supabaseAdmin
        .from('tenant_member')
        .select('tenant_id, role')
        .eq('user_id', userId)

      if (memberships && memberships.length > 0) {
        const owned = memberships.filter((m: any) => m.role === 'owner')
        for (const o of owned) {
          // Deleting tenant cascades to buku, salinan, kategori, rak, anggota, peminjaman
          await supabaseAdmin.from('tenant').delete().eq('id', o.tenant_id)
        }
      }

      // 2. Delete remaining tenant memberships
      await supabaseAdmin.from('tenant_member').delete().eq('user_id', userId)

      // 3. Delete from app_user
      await supabaseAdmin.from('app_user').delete().eq('id', userId)

      // 4. Delete user from Supabase Auth
      await supabaseAdmin.auth.admin.deleteUser(userId)

      return createCorsResponse({
        success: true,
        message: 'Akun dan seluruh data perpustakaan berhasil dihapus permanen'
      })
    } catch (e: any) {
      return createErrorResponse(e.message, 500)
    }
  }

  return createErrorResponse('Not Found', 404)
})
