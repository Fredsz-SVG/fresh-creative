const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function check() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  // Check actual column types
  const { data, error } = await supabase.rpc('to_jsonb', {}).catch(() => null)
  
  // Just read one row and see what we get
  const { data: pkg, error: err } = await supabase
    .from('pricing_packages')
    .select('*')
    .eq('id', 'basic')
    .single()

  console.log('Package:', JSON.stringify(pkg, null, 2))
  console.log('Error:', err)
  console.log('')
  console.log('ai_labs_features type:', typeof pkg?.ai_labs_features)
  console.log('ai_labs_features value:', pkg?.ai_labs_features)
  console.log('Is array?', Array.isArray(pkg?.ai_labs_features))

  // Check column info from information_schema
  const { data: cols, error: colErr } = await supabase
    .from('information_schema.columns' )
    .select('column_name, data_type, udt_name')
    .eq('table_name', 'pricing_packages')
    .in('column_name', ['ai_labs_features', 'flipbook_enabled', 'features'])
  
  // If that doesn't work, try raw SQL
  if (colErr) {
    console.log('\nCannot query information_schema directly, trying rpc...')
    const { data: rawCols, error: rawErr } = await supabase.rpc('exec_sql', {
      sql: "SELECT column_name, data_type, udt_name FROM information_schema.columns WHERE table_name = 'pricing_packages' AND column_name IN ('ai_labs_features', 'flipbook_enabled', 'features')"
    }).catch(() => ({ data: null, error: 'no rpc' }))
    console.log('Raw cols:', rawCols, rawErr)
  } else {
    console.log('\nColumn types:')
    cols?.forEach(c => console.log(`  ${c.column_name}: ${c.data_type} (${c.udt_name})`))
  }

  // Try to update with array
  console.log('\n--- Test update with array ---')
  const { data: upArr, error: errArr } = await supabase
    .from('pricing_packages')
    .update({ ai_labs_features: ['tryon', 'pose'] })
    .eq('id', 'basic')
    .select('id, ai_labs_features')
  console.log('Array update:', { data: upArr, error: errArr?.message })

  // Try to update with JSON string
  console.log('\n--- Test update with JSON string ---')
  const { data: upStr, error: errStr } = await supabase
    .from('pricing_packages')
    .update({ ai_labs_features: JSON.stringify(['tryon', 'pose']) })
    .eq('id', 'basic')
    .select('id, ai_labs_features')
  console.log('String update:', { data: upStr, error: errStr?.message })
}

check().catch(e => console.error('FATAL:', e))
