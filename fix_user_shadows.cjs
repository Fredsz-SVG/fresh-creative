const fsStr = require('fs');
let contentStr = fsStr.readFileSync('app/user/riwayat/page.tsx', 'utf8');

// Replace card shadows
contentStr = contentStr.replace(/shadow-\[5px_5px_0_0_#0f172a\]/g, 'shadow-[3px_3px_0_0_#64748b]');
contentStr = contentStr.replace(/hover:shadow-\[7px_7px_0_0_#0f172a\]/g, 'hover:shadow-[5px_5px_0_0_#64748b]');

// Replace button/badge shadows
contentStr = contentStr.replace(/shadow-\[2px_2px_0_0_#0f172a\]/g, 'shadow-[2px_2px_0_0_#64748b]');
contentStr = contentStr.replace(/shadow-\[3px_3px_0_0_#0f172a\]/g, 'shadow-[2px_2px_0_0_#64748b]');

fsStr.writeFileSync('app/user/riwayat/page.tsx', contentStr);
