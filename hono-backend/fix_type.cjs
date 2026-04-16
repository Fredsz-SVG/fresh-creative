
const fs = require('fs');
const p = 'C:/Users/Admin/Downloads/Fresh-web/frontend/hono-backend/routes/albums/id/unlock-feature.ts';
let code = fs.readFileSync(p, 'utf8');
code = code.replace(/flipbook_enabled: boolean/g, 'flipbook_enabled: boolean | number | string');
fs.writeFileSync(p, code);

