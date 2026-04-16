const fs = require('fs')
const filePath = 'C:/Users/Admin/Downloads/Fresh-web/frontend/hono-backend/routes/albums/albums.ts'
let code = fs.readFileSync(filePath, 'utf8')

code = code.replace(
  /snapshot = JSON\.parse\(rest\.package_snapshot\)/,
  'snapshot = typeof rest.package_snapshot === "string" ? JSON.parse(rest.package_snapshot) : rest.package_snapshot'
)
code = code.replace(/import { invalidateUserResponseCaches } from '..\/..\/lib\/api-helpers'/g, '')

fs.writeFileSync(filePath, code, 'utf8')
console.log('Fixed typescript issues in albums.ts')
