// Test update pricing_packages directly and via simulated API flow
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function test() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  // 1. Read current state of 'basic' package
  console.log('=== 1. Current state ===')
  const { data: before } = await supabase.from('pricing_packages').select('*').eq('id', 'basic').single()
  console.log('Before:', JSON.stringify({
    id: before.id,
    name: before.name,
    flipbook_enabled: before.flipbook_enabled,
    ai_labs_features: before.ai_labs_features,
  }))

  // 2. Simulate what the form sends: update with string numbers (like the form does)
  console.log('\n=== 2. Update with form-like data (string numbers) ===')
  const formLikePayload = {
    name: before.name,
    price_per_student: String(before.price_per_student), // Form sends string!
    min_students: String(before.min_students),            // Form sends string!
    features: before.features,
    flipbook_enabled: !before.flipbook_enabled, // toggle it
    ai_labs_features: ['tryon', 'pose', 'image_remove_bg'],
  }
  console.log('Payload (string numbers):', JSON.stringify(formLikePayload))

  const { data: res1, error: err1 } = await supabase
    .from('pricing_packages')
    .update(formLikePayload)
    .eq('id', 'basic')
    .select()

  console.log('Result:', { data: res1, error: err1 })

  // 3. Now try with proper number types
  console.log('\n=== 3. Update with proper number types ===')
  const properPayload = {
    name: before.name,
    price_per_student: Number(before.price_per_student),
    min_students: Number(before.min_students),
    features: before.features,
    flipbook_enabled: before.flipbook_enabled, // revert
    ai_labs_features: before.ai_labs_features || [],
  }
  console.log('Payload (proper numbers):', JSON.stringify(properPayload))

  const { data: res2, error: err2 } = await supabase
    .from('pricing_packages')
    .update(properPayload)
    .eq('id', 'basic')
    .select()

  console.log('Result:', { data: res2, error: err2 })

  // 4. Verify final state
  console.log('\n=== 4. Final state ===')
  const { data: after } = await supabase.from('pricing_packages').select('*').eq('id', 'basic').single()
  console.log('After:', JSON.stringify({
    id: after.id,
    name: after.name,
    flipbook_enabled: after.flipbook_enabled,
    ai_labs_features: after.ai_labs_features,
  }))
}

test().catch(console.error)
