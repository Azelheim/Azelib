import { createCorsResponse, createErrorResponse, corsHeaders, getSupabaseAdmin } from '../_shared/utils.ts'

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

      // Check if email exists
      // Wait, we can just attempt to sign up or use admin API to create user.
      // But we need to insert to app_user too.
      // If we use admin.createUser, it won't trigger a sign-in, it just creates the user.
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
    } catch (e) {
      return createErrorResponse(e.message, 500)
    }
  }

  return createErrorResponse('Not Found', 404)
})
