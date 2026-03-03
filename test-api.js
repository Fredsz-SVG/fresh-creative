// Test the GET pricing API using service role key directly
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function test() {
  // Test with service role key (what our updated API now uses)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
  
  const { data, error } = await supabase.from('pricing_packages').select('*')
  
  if (error) {
    console.error('ERROR:', error)
    return
  }
  
  console.log('=== Packages from service role ===')
  data.forEach(pkg => {
    console.log(`\n${pkg.name}:`)
    console.log('  flipbook_enabled:', pkg.flipbook_enabled)
    console.log('  ai_labs_features:', pkg.ai_labs_features)
    console.log('  all keys:', Object.keys(pkg).join(', '))
  })

  // Also test with anon key to compare
  const supabaseAnon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
  
  const { data: anonData, error: anonError } = await supabaseAnon.from('pricing_packages').select('*')
  
  if (anonError) {
    console.error('\nANON ERROR:', anonError)
    return
  }
  
  console.log('\n=== Packages from anon key ===')
  anonData.forEach(pkg => {
    console.log(`\n${pkg.name}:`)
    console.log('  flipbook_enabled:', pkg.flipbook_enabled)
    console.log('  ai_labs_features:', pkg.ai_labs_features)
    console.log('  all keys:', Object.keys(pkg).join(', '))
  })
}

test().catch(console.error)
