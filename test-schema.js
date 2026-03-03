// Test if columns exist in pricing_packages
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function main() {
  // 1. Check if column exists via raw SQL
  const { data: cols, error: colErr } = await supabase.rpc('', {}).maybeSingle()
  
  // Try direct query instead
  const { data, error } = await supabase
    .from('pricing_packages')
    .select('id, name, flipbook_enabled, ai_labs_features')
    .limit(1)

  console.log('Query result:', JSON.stringify({ data, error }, null, 2))

  // Also try a simple select *
  const { data: all, error: allErr } = await supabase
    .from('pricing_packages')
    .select('*')
    .limit(1)

  console.log('\nSelect * result:', JSON.stringify({ data: all, error: allErr }, null, 2))
  
  if (all && all.length > 0) {
    console.log('\nColumns in pricing_packages:', Object.keys(all[0]))
  }
}

main()
