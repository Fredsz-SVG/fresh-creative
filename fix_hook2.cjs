
const fs = require('fs');
const pf = 'C:/Users/Admin/Downloads/Fresh-web/frontend/components/yearbook/hooks/useYearbookFeatures.ts';
let code = fs.readFileSync(pf, 'utf-8');

code = code.replace(
  /setFlipbookEnabledByPackage\(data\.flipbook_enabled_by_package === true\)\s+setFlipbookUnlockedOnAlbum\(data\.flipbook_unlocked_on_album === true\)/g,
  \setFlipbookEnabledByPackage(data.flipbook_enabled_by_package === true || data.flipbook_unlocked_on_album === true)\
);

fs.writeFileSync(pf, code);

