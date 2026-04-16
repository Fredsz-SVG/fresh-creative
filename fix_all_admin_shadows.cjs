const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

walkDir('app/admin', function(filePath) {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;
    
    // Replace all shadow variations of #0f172a with softer #64748b variants
    content = content.replace(/shadow-\[(\d+px_\d+px)_0_0_#0f172a\]/g, 'shadow-[#64748b]');
    
    // Specifically handle some larger ones to scale down
    content = content.replace(/shadow-\[6px_6px_0_0_#64748b\]/g, 'shadow-[4px_4px_0_0_#64748b]');
    content = content.replace(/shadow-\[5px_5px_0_0_#64748b\]/g, 'shadow-[3px_3px_0_0_#64748b]');
    content = content.replace(/shadow-\[4px_4px_0_0_#64748b\]/g, 'shadow-[3px_3px_0_0_#64748b]');
    

    if (original !== content) {
      fs.writeFileSync(filePath, content);
      console.log('Updated', filePath);
    }
  }
});
