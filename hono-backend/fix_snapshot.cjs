
const fs = require('fs');
const path = 'C:/Users/Admin/Downloads/Fresh-web/frontend/hono-backend/routes/albums/id/unlock-feature.ts';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
  '      flipbookEnabledByPackage = snapshot.flipbook_enabled === true\r\n      aiLabsFeaturesByPackage = snapshot.ai_labs_features || []',
  \      flipbookEnabledByPackage = snapshot.flipbook_enabled === true || snapshot.flipbook_enabled === 1 || String(snapshot.flipbook_enabled) === 'true';
      let _ai = snapshot.ai_labs_features || [];
      if (typeof _ai === 'string') {
        try { _ai = JSON.parse(_ai); } catch (e) {}
      }
      aiLabsFeaturesByPackage = Array.isArray(_ai) ? _ai : [];\
);

code = code.replace(
  '      flipbookEnabledByPackage = snapshot.flipbook_enabled === true\\n      aiLabsFeaturesByPackage = snapshot.ai_labs_features || []',
  \      flipbookEnabledByPackage = snapshot.flipbook_enabled === true || snapshot.flipbook_enabled === 1 || String(snapshot.flipbook_enabled) === 'true';
      let _ai = snapshot.ai_labs_features || [];
      if (typeof _ai === 'string') {
        try { _ai = JSON.parse(_ai); } catch (e) {}
      }
      aiLabsFeaturesByPackage = Array.isArray(_ai) ? _ai : [];\
);

fs.writeFileSync(path, code);
console.log('Fixed unlock-feature.ts snapshot parsing');

