// Test PUT /api/pricing to see if it actually works
async function test() {
  const baseUrl = 'http://localhost:3001'
  
  // First, GET to see current data
  console.log('=== GET current packages ===')
  const getRes = await fetch(`${baseUrl}/api/pricing?t=${Date.now()}`)
  const packages = await getRes.json()
  console.log('Status:', getRes.status)
  packages.forEach(pkg => {
    console.log(`  ${pkg.name}: flipbook=${pkg.flipbook_enabled}, ai_labs=${JSON.stringify(pkg.ai_labs_features)}, price=${pkg.price_per_student} (${typeof pkg.price_per_student})`)
  })

  // Now try PUT to update basic package - simulate what the form sends
  const basicPkg = packages.find(p => p.id === 'basic')
  if (!basicPkg) {
    console.log('No basic package found')
    return
  }

  console.log('\n=== PUT update basic (simulate form - string values) ===')
  // This is what the form actually sends - price_per_student as STRING
  const putRes = await fetch(`${baseUrl}/api/pricing`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...basicPkg,
      price_per_student: String(basicPkg.price_per_student), // form sends string!
      min_students: String(basicPkg.min_students), // form sends string!
      flipbook_enabled: true,
      ai_labs_features: ['tryon', 'pose', 'photogroup'],
    }),
  })
  const putData = await putRes.text()
  console.log('PUT Status:', putRes.status)
  console.log('PUT Response:', putData)

  // GET again to verify
  console.log('\n=== GET after update ===')
  const getRes2 = await fetch(`${baseUrl}/api/pricing?t=${Date.now()}`)
  const packages2 = await getRes2.json()
  const basic2 = packages2.find(p => p.id === 'basic')
  console.log('Basic after update:', JSON.stringify(basic2, null, 2))
}

test().catch(console.error)
