const fs = require('fs');
const p = 'C:/Users/Admin/Downloads/Fresh-web/frontend/hono-backend/routes/albums/id/unlock-feature.ts';
let code = fs.readFileSync(p, 'utf8');

code = code.replace(
  /flipbookEnabledByPackage = snapshot\.flipbook_enabled === true[\s\S]*?aiLabsFeaturesByPackage = snapshot\.ai_labs_features \|\| \[\]/,
  "flipbookEnabledByPackage = snapshot.flipbook_enabled === true || snapshot.flipbook_enabled === 1 || String(snapshot.flipbook_enabled) === 'true';\n      let _ai = snapshot.ai_labs_features || [];\n      if (typeof _ai === 'string') {\n        try { _ai = JSON.parse(_ai); } catch (e) {}\n      }\n      aiLabsFeaturesByPackage = Array.isArray(_ai) ? _ai : [];"
);

fs.writeFileSync(p, code);
console.log('Fixed');
