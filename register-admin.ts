import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function main() {
  console.log('Registering admin user...')
  
  // 1. Create User
  const { data: userData, error: userError } = await supabase.auth.admin.createUser({
    email: 'rajarajanalagirisamy@gmail.com',
    password: 'Rajarajan@12',
    email_confirm: true,
    user_metadata: {
      full_name: 'Rajarajan A',
      phone: '+91 9342433396',
    }
  })

  if (userError) {
    console.error('Failed to create user:', userError.message)
    process.exit(1)
  }
  
  console.log('Admin user created successfully:', userData.user.id)
  process.exit(0)
}

main()
