import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ygppsjbiiufzvyeeudjs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlncHBzamJpaXVmenZ5ZWV1ZGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5MzIzMDQsImV4cCI6MjEwMjUwODMwNH0.c-c31Tj72q23IIXOkRYUJjTmA1zk-989gOxbS-2WkKE';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkCloudSecurity() {
  console.log('=== CHECKING SUPABASE CLOUD LIVE INSTANCE ===');
  console.log('URL:', SUPABASE_URL);

  // 1. Check if public.tenant contains any pentest dummy tenants
  const { data: tenants, error: tenantErr } = await supabase
    .from('tenant')
    .select('id, nama, qr_code_value, created_at');

  console.log('\n--- 1. Query public.tenant on Cloud ---');
  if (tenantErr) {
    console.log('Tenant query error / RLS protected:', tenantErr.message);
  } else {
    console.log(`Found ${tenants.length} tenants on Cloud:`);
    tenants.forEach(t => console.log(` - ID: ${t.id}, Nama: "${t.nama}", Token/QR: "${t.qr_code_value}"`));
    
    const dummyTenants = tenants.filter(t => 
      (t.nama && t.nama.toLowerCase().includes('pentest')) ||
      (t.nama && t.nama.toLowerCase().includes('authtest')) ||
      (t.nama && t.nama.toLowerCase().includes('zz_random')) ||
      (t.nama && t.nama.toLowerCase().includes('bola'))
    );
    console.log('Dummy pentest tenants found in Cloud:', dummyTenants.length);
  }

  // 2. Check public.buku on Cloud
  const { data: books, error: bookErr } = await supabase
    .from('buku')
    .select('id, judul, tenant_id')
    .limit(10);

  console.log('\n--- 2. Query public.buku on Cloud ---');
  if (bookErr) {
    console.log('Book query error / RLS protected:', bookErr.message);
  } else {
    console.log(`Found ${books.length} books on Cloud:`);
    books.forEach(b => console.log(` - Judul: "${b.judul}", TenantID: ${b.tenant_id}`));
  }

  // 3. Test GoTrue Auth settings & signup/signin endpoints on Cloud
  console.log('\n--- 3. Testing Cloud GoTrue Auth Behavior ---');
  // Attempt login with a dummy pentest email to check if it exists or returns standard invalid credentials
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'authtest_a@example.com',
    password: 'TestPassword123!',
  });
  
  if (authErr) {
    console.log('Auth login response for authtest_a@example.com:', authErr.message);
  } else {
    console.log('Account authtest_a@example.com existed!', authData);
  }

  const { data: authData2, error: authErr2 } = await supabase.auth.signInWithPassword({
    email: 'usera_bola@test.com',
    password: 'TestPassword123!',
  });
  
  if (authErr2) {
    console.log('Auth login response for usera_bola@test.com:', authErr2.message);
  } else {
    console.log('Account usera_bola@test.com existed!', authData2);
  }

  console.log('\n=== CLOUD SECURITY AUDIT COMPLETE ===');
}

checkCloudSecurity().catch(err => {
  console.error('Fatal error checking cloud security:', err);
  process.exit(1);
});
