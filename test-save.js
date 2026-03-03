// Test saving ai_labs_features to pricing_packages
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function main() {
  // Test update with ai_labs_features
  const { data: updateResult, error: updateErr } = await supabase
    .from('pricing_packages')
    .update({ 
      flipbook_enabled: true, 
      ai_labs_features: ['tryon', 'pose'] 
    })
    .eq('id', 'basic')
    .select()

  console.log('Update result:', JSON.stringify({ data: updateResult, error: updateErr }, null, 2))

  // Verify
  const { data: verify, error: verifyErr } = await supabase
    .from('pricing_packages')
    .select('id, name, flipbook_enabled, ai_labs_features')
  
  console.log('\nAfter update:', JSON.stringify({ data: verify, error: verifyErr }, null, 2))
}

main()
