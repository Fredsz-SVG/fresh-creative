const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  if (!fs.existsSync(dir)) return;
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

      // Soften thick dark borders to thinner lighter borders 
      content = content.replace(/border-4 border-slate-900/g, 'border-2 border-slate-200');
      content = content.replace(/border-\[3px\] border-slate-900/g, 'border-2 border-slate-200');
      content = content.replace(/border-slate-900/g, 'border-slate-200');
      content = content.replace(/border-slate-800/g, 'border-slate-200');

      // Soften all hard #0f172a shadows to #334155
      content = content.replace(/shadow-\[(\d+px_\d+px)_0_0_#0f172a\]/g, 'shadow-[#334155]');
      content = content.replace(/dark:shadow-\[(\d+px_\d+px)_0_0_#334155\]/g, 'dark:shadow-[#1e293b]');
      content = content.replace(/shadow-\[(\d+px_\d+px)_0_0_#64748b\]/g, 'shadow-[#334155]');

      // Hover shadows
      content = content.replace(/hover:shadow-\[(\d+px_\d+px)_0_0_#0f172a\]/g, 'hover:shadow-[#334155]');
      content = content.replace(/hover:shadow-\[(\d+px_\d+px)_0_0_#64748b\]/g, 'hover:shadow-[#334155]');


      // Specific fix for "rounded-[24px]" and big border-4s that might just say order-4
      content = content.replace(/className=\"[^\"]*border-4[^\"]*\"/g, function(match){
         return match.replace('border-4', 'border-2');
      });

      if (original !== content) {
        fs.writeFileSync(filePath, content);
        console.log('Fixed styles in', filePath);
      }
    }
  });
}

processFiles('app/admin');
processFiles('app/user');
processFiles('components');

