const fs = require('fs');

let content = fs.readFileSync('components/dashboard/DashboardShell.tsx', 'utf8');
let original = content;

// Fix invalid shadow syntax (shadow-[#334155] to shadow-[4px_4px_0_0_#334155] or shadow-[6px_6px_0_0_#334155] for popups)
// For popup modals we want to make sure it exists
content = content.replace(/shadow-\[#334155\]/g, 'shadow-[4px_4px_0_0_#334155]');
content = content.replace(/dark:shadow-\[#1e293b\]/g, 'dark:shadow-[4px_4px_0_0_#1e293b]');

// Fix header shadow string
content = content.replace(/shadow-\[0_1px_0_0_#0f172a\]/g, 'shadow-[0_2px_0_0_#334155]');

// Fix bottom nav border 
content = content.replace(/border-t-4 border-slate-200/g, 'border-t-2 border-slate-200');

// Hover states that might be broken
content = content.replace(/hover:shadow-\[#334155\]/g, 'hover:shadow-[4px_4px_0_0_#334155]');
content = content.replace(/dark:hover:shadow-\[#1e293b\]/g, 'dark:hover:shadow-[4px_4px_0_0_#1e293b]');

// Sm shadows (icons) 
content = content.replace(/shadow-\[4px_4px_0_0_#334155\]/g, 'shadow-[3px_3px_0_0_#334155]'); // default to 3px to match soft
content = content.replace(/dark:shadow-\[4px_4px_0_0_#1e293b\]/g, 'dark:shadow-[3px_3px_0_0_#1e293b]'); 

if(original !== content) {
    fs.writeFileSync('components/dashboard/DashboardShell.tsx', content);
    console.log('Fixed Shell');
}
