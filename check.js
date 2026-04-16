const fs = require('fs');
let content = fs.readFileSync('components/dashboard/DashboardShell.tsx', 'utf-8');
console.log(content.split('<aside')[2].substring(0, 1000));
