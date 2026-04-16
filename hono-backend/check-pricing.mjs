import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://fiunsbydamkllpdaueog.supabase.co'
const SUPABASE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpdW5zYnlkYW1rbGxwZGF1ZW9nIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTY0OTgwMCwiZXhwIjoyMDg1MjI1ODAwfQ.N9Or_bxZ-evpJzhmzZbgfOI_SJSVvpRcaNmuKLK4Na4'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function check() {
  const { data, error } = await supabase.from('pricing_packages').select('*')
  console.log('Result:', { data, error })
}

check()
