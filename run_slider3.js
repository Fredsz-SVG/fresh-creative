const fs = require('fs');
let filepath = 'app/admin/riwayat/page.tsx';
let txt = fs.readFileSync(filepath, 'utf8');

// Soften everything
txt = txt.replace(/text-3xl font-black text-slate-900 dark:text-white(?: sm:text-4xl)?/g, 'text-xl md:text-2xl font-bold text-slate-900 dark:text-white');
txt = txt.replace(/font-bold text-sm sm:text-base/g, 'font-medium text-xs md:text-sm');
txt = txt.replace(/border-4/g, 'border-2');
txt = txt.replace(/shadow-\[8px_8px_0_0_#0f172a\]/g, 'shadow-[3px_3px_0_0_#64748b]');
txt = txt.replace(/dark:shadow-\[8px_8px_0_0_#334155\]/g, 'dark:shadow-[3px_3px_0_0_#334155]');
txt = txt.replace(/shadow-\[4px_4px_0_0_#0f172a\]/g, 'shadow-[2px_2px_0_0_#64748b]');
txt = txt.replace(/dark:shadow-\[4px_4px_0_0_#334155\]/g, 'dark:shadow-[2px_2px_0_0_#334155]');
txt = txt.replace(/rounded-3xl/g, 'rounded-2xl');
txt = txt.replace(/font-black/g, 'font-bold');
txt = txt.replace(/bg-emerald-50 dark:bg-slate-800/g, 'bg-white dark:bg-slate-900');
txt = txt.replace(/bg-sky-50 dark:bg-slate-800/g, 'bg-white dark:bg-slate-900');
txt = txt.replace(/bg-amber-50 dark:bg-slate-800/g, 'bg-white dark:bg-slate-900');
txt = txt.replace(/bg-rose-50 dark:bg-slate-800/g, 'bg-white dark:bg-slate-900');
txt = txt.replace(/bg-violet-50 dark:bg-slate-800/g, 'bg-white dark:bg-slate-900');
txt = txt.replace(/border-slate-900 dark:border-slate-700/g, 'border-slate-200 dark:border-slate-700');
txt = txt.replace(/border-slate-900/g, 'border-slate-200');

// Slider replace 
let s = txt.indexOf('<div className="grid grid-cols-2');
let endStr2 = '</button>\n        </div>';
let e = txt.indexOf(endStr2, s) + endStr2.length;
let oldStr = txt.substring(s, e);

let sliderHTML = '<div className="flex bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-2xl max-w-sm mb-8 border border-slate-200 dark:border-slate-700">' + '\n' +
'          <button' + '\n' +
'            type="button"' + '\n' +
'            onClick={() => { setViewMode(\\'mine\\'); setCurrentPage(1); }}' + '\n' +
'            className={lex-1 flex min-w-0 items-center justify-center gap-1.5 sm:gap-2 px-2 py-2 sm:px-6 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 whitespace-nowrap }' + '\n' +
'          >' + '\n' +
'            <User className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" strokeWidth={viewMode === \\'mine\\' ? 3 : 2} />' + '\n' +
'            <span className="truncate"><span className="sm:hidden">Saya</span><span className="hidden sm:inline">Riwayat Saya</span></span>' + '\n' +
'          </button>' + '\n' +
'          <button' + '\n' +
'            type="button"' + '\n' +
'            onClick={() => { setViewMode(\\'all\\'); setCurrentPage(1); }}' + '\n' +
'            className={lex-1 flex min-w-0 items-center justify-center gap-1.5 sm:gap-2 px-2 py-2 sm:px-6 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 whitespace-nowrap }' + '\n' +
'          >' + '\n' +
'            <Users className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" strokeWidth={viewMode === \\'all\\' ? 3 : 2} />' + '\n' +
'            <span className="truncate"><span className="sm:hidden">Semua User</span><span className="hidden sm:inline">Riwayat Semua User</span></span>' + '\n' +
'          </button>' + '\n' +
'        </div>';

txt = txt.replace(oldStr, sliderHTML);

fs.writeFileSync(filepath, txt);
console.log("Processed " + filepath);
