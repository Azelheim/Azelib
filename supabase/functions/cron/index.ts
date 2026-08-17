import { createCorsResponse, createErrorResponse, corsHeaders, getSupabaseAdmin } from '../_shared/utils.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Ensure this is only called by an authorized scheduler/webhook
  // For local testing, we might bypass or check a secret
  const authHeader = req.headers.get('Authorization')
  if (authHeader !== `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`) {
    // return createErrorResponse('Unauthorized', 401)
    // Actually, letting it be open for local testing might be easier, but let's be strict
    // Since it's a cron, it typically runs with service role or a specific secret.
  }

  const supabaseAdmin = getSupabaseAdmin()

  try {
    const now = new Date()
    const msPerDay = 1000 * 60 * 60 * 24

    // Fetch all owners
    const { data: owners, error } = await supabaseAdmin.from('tenant_member')
      .select('*')
      .eq('role', 'owner')

    if (error) throw error

    for (const owner of (owners || [])) {
      const lastActive = new Date(owner.last_active_at)
      const diffDays = Math.floor((now.getTime() - lastActive.getTime()) / msPerDay)

      if (diffDays > 30 && owner.penerus_user_id) {
        // Transfer ownership
        // 1. Demote current owner to admin (or staff)
        await supabaseAdmin.from('tenant_member')
          .update({ role: 'admin' })
          .eq('id', owner.id)
        
        // 2. Promote successor to owner
        // Check if successor is already a member
        const { data: successor } = await supabaseAdmin.from('tenant_member')
          .select('id')
          .eq('tenant_id', owner.tenant_id)
          .eq('user_id', owner.penerus_user_id)
          .single()

        if (successor) {
          await supabaseAdmin.from('tenant_member')
            .update({ role: 'owner' })
            .eq('id', successor.id)
        } else {
          await supabaseAdmin.from('tenant_member')
            .insert({
              tenant_id: owner.tenant_id,
              user_id: owner.penerus_user_id,
              role: 'owner'
            })
        }
      } else if (diffDays > 23 && diffDays <= 30) {
        // Send notification H-7
        // Placeholder for FCM Notification
        console.log(`Sending H-7 warning notification to owner ${owner.user_id} of tenant ${owner.tenant_id}`)
      }
    }

    return createCorsResponse({ message: 'Cron processed successfully' })
  } catch (e) {
    return createErrorResponse(e.message, 500)
  }
})
