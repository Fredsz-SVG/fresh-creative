const fs = require('fs');
const filePath = 'components/albums/AlbumsView.tsx';
let code = fs.readFileSync(filePath, 'utf-8');

// The card tag mobile
code = code.replace(
  /\$\{album\.payment_status === 'paid' \? 'bg-emerald-300 text-slate-900' : 'bg-red-400 text-white'\}\}\>\s*\{album\.payment_status === 'paid' \? 'Lunas' : 'Belum Bayar'\}/g,
  "\}>\n                            {isPaid ? 'Lunas' : isIndividualPayment ? 'Bayar Mandiri' : 'Belum Bayar'}"
);

// Mobile popup or general labels referring to Lunas / Belum Bayar
code = code.replace(
  /\{isPaid \? 'Lunas' : 'Belum Bayar'\}/g,
  "{isPaid ? 'Lunas' : isIndividualPayment ? 'Bayar Mandiri' : 'Belum Bayar'}"
);
code = code.replace(
  /\{isPaid \? 'text-indigo-600 dark:text-indigo-300' : 'text-red-500 dark:text-red-300'\}/g,
  "{isPaid ? 'text-emerald-600 dark:text-emerald-400' : isIndividualPayment ? 'text-amber-500 dark:text-amber-400' : 'text-red-500 dark:text-red-300'}"
);

// Desktop table tag
code = code.replace(
  /album\.payment_status === 'paid'\s*\? 'bg-emerald-300 dark:bg-emerald-700 text-slate-900 dark:text-white'\s*: 'bg-red-400 dark:bg-red-700 text-white'\s*\}\\}>\s*\{album\.payment_status === 'paid' \? 'Paid' : 'Unpaid'\}/g,
  "isPaid\n                                      ? 'bg-emerald-300 dark:bg-emerald-700 text-slate-900 dark:text-white'\n                                      : isIndividualPayment\n                                      ? 'bg-amber-300 dark:bg-amber-700 text-slate-900 dark:text-white'\n                                      : 'bg-red-400 dark:bg-red-700 text-white'\n                                  }}>\n                                  {isPaid ? 'Paid' : isIndividualPayment ? 'Mandiri' : 'Unpaid'}"
);

fs.writeFileSync(filePath, code, 'utf-8');
console.log('Fixed tags globally');
