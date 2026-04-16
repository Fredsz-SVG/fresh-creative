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

      // Restore globally broken shadows
      content = content.replace(/shadow-\[#334155\]/g, 'shadow-[4px_4px_0_0_#334155]');
      content = content.replace(/dark:shadow-\[#1e293b\]/g, 'dark:shadow-[4px_4px_0_0_#1e293b]');
      
      content = content.replace(/hover:shadow-\[#334155\]/g, 'hover:shadow-[4px_4px_0_0_#334155]');
      content = content.replace(/dark:hover:shadow-\[#1e293b\]/g, 'dark:hover:shadow-[4px_4px_0_0_#1e293b]');

      if (original !== content) {
        fs.writeFileSync(filePath, content);
        console.log('Restored broken shadows in', filePath);
      }
    }
  });
}

processFiles('app');
processFiles('components');
