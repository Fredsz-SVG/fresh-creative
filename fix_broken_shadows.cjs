const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

function processFiles(dir) {
  walkDir(dir, function(filePath) {
    if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
      let content = fs.readFileSync(filePath, 'utf8');
      let original = content;

      // Fix incorrectly replaced shadows
      content = content.replace(/shadow-\[#334155\]/g, 'shadow-[4px_4px_0_0_#334155]');
      content = content.replace(/dark:shadow-\[#1e293b\]/g, 'dark:shadow-[4px_4px_0_0_#1e293b]');
      
      content = content.replace(/hover:shadow-\[#334155\]/g, 'hover:shadow-[4px_4px_0_0_#334155]');
      
      // Also replace any lingering thick black borders that should be standard
      content = content.replace(/border-4 border-slate-900/g, 'border-2 border-slate-200');
      content = content.replace(/border-slate-900/g, 'border-slate-200');

      if (original !== content) {
        fs.writeFileSync(filePath, content);
        console.log('Restored padding shadows in', filePath);
      }
    }
  });
}

// target admin, riwayat
processFiles('app/admin');
processFiles('app/user/riwayat');

