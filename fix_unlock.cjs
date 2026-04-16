
const fs = require('fs');
const pf = 'C:/Users/Admin/Downloads/Fresh-web/frontend/hono-backend/routes/albums/id/unlock-feature.ts';
let code = fs.readFileSync(pf, 'utf-8');
code = code.replace(
  /if \(\s*album\?\.pricing_package_id && album\?\.package_snapshot\s*\)/g,
  'if (album?.package_snapshot)'
);
fs.writeFileSync(pf, code);
console.log('Fixed unlock-feature.ts');

