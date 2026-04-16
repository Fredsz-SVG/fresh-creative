
const fs = require('fs');
const pf = 'C:/Users/Admin/Downloads/Fresh-web/frontend/components/yearbook/hooks/useYearbookFeatures.ts';
let code = fs.readFileSync(pf, 'utf-8');

if (!code.includes('flipbookUnlockedOnAlbum')) {
  code = code.replace(
    /const \[flipbookEnabledByPackage, setFlipbookEnabledByPackage\] = useState\(false\)/,
    \const [flipbookEnabledByPackage, setFlipbookEnabledByPackage] = useState(false)
  const [flipbookUnlockedOnAlbum, setFlipbookUnlockedOnAlbum] = useState(false)\
  );

  code = code.replace(
    /setFlipbookEnabledByPackage\(data\.flipbook_enabled_by_package === true\)/,
    \setFlipbookEnabledByPackage(data.flipbook_enabled_by_package === true)
        setFlipbookUnlockedOnAlbum(data.flipbook_unlocked_on_album === true)\
  );

  code = code.replace(
    /setFlipbookEnabledByPackage,/,
    \setFlipbookEnabledByPackage,
    flipbookUnlockedOnAlbum,
    setFlipbookUnlockedOnAlbum,\
  );

  fs.writeFileSync(pf, code);
  console.log('Fixed hook');
} else {
  console.log('Already fixed hook');
}

