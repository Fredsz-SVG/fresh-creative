const fs = require('fs')
let code = fs.readFileSync('routes/albums/albums.ts', 'utf8')
code = code.replace(
  /const snapshot \= rest\.package_snapshot \? JSON\.parse\(rest\.package_snapshot as string\) : null/g,
  "let snapshot = null;\n  if (rest.package_snapshot) {\n    if (typeof rest.package_snapshot === 'object') {\n      snapshot = rest.package_snapshot;\n    } else {\n      try {\n        snapshot = JSON.parse(rest.package_snapshot);\n      } catch (e) {\n        console.error('FAILED TO PARSE', rest.package_snapshot);\n        snapshot = null;\n      }\n    }\n  }"
)
fs.writeFileSync('routes/albums/albums.ts', code)
