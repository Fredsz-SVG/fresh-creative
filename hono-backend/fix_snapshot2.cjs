
const fs = require('fs');
const p = 'C:/Users/Admin/Downloads/Fresh-web/frontend/hono-backend/routes/albums/id/unlock-feature.ts';
let code = fs.readFileSync(p, 'utf8');

code = code.replace(
  /flipbookEnabledByPackage = snapshot\.flipbook_enabled === true[\s\S]*?aiLabsFeaturesByPackage = snapshot\.ai_labs_features \|\| \[\]/,
  \lipbookEnabledByPackage = snapshot.flipbook_enabled === true || snapshot.flipbook_enabled === 1 || String(snapshot.flipbook_enabled) === 'true';
      let _ai = snapshot.ai_labs_features || [];
      if (typeof _ai === 'string') {
        try { _ai = JSON.parse(_ai); } catch (e) {}
      }
      aiLabsFeaturesByPackage = Array.isArray(_ai) ? _ai : [];\
);

fs.writeFileSync(p, code);

