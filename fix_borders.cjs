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
      
      // Admin page explicitly uses border-slate-900 border-4 which looks harsh
      // Let's replace border-4 border-slate-900 with border-2 border-slate-200
      content = content.replace(/border-4 border-slate-900/g, 'border-2 border-slate-200');
      content = content.replace(/border-4 border-slate-800/g, 'border-2 border-slate-200');
      content = content.replace(/border-slate-900/g, 'border-slate-200');
      
      
      // Let's replace the custom soft #64748b with the albums reference #334155 (for light) or #1e293b (for dark)
      content = content.replace(/shadow-\[(\d+px_\d+px)_0_0_#64748b\]/g, 'shadow-[#334155]');
      content = content.replace(/shadow-\[(\d+px_\d+px)_0_0_#0f172a\]/g, 'shadow-[#334155]');
      
      // And the hover shadows
      content = content.replace(/hover:shadow-\[(\d+px_\d+px)_0_0_#64748b\]/g, 'hover:shadow-[#334155]');
      content = content.replace(/hover:shadow-\[(\d+px_\d+px)_0_0_#0f172a\]/g, 'hover:shadow-[#334155]');


      if (original !== content) {
        fs.writeFileSync(filePath, content);
        console.log('Updated', filePath);
      }
    }
  });
}

// target admin, riwayat
processFiles('app/admin');
processFiles('app/user/riwayat');

