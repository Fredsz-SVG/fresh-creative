import fs from 'fs';

let code = fs.readFileSync('lib/generate-invoice.ts', 'utf8');

code = code.replace(
  'if (pkg.price_per_student)',
  'if (pkg && pkg.price_per_student)'
);

code = code.replace(
  'if (pkg.features && Array.isArray(pkg.features))',
  'if (pkg && pkg.features && Array.isArray(pkg.features))'
);

code = code.replace(
  "if (lineItemsHtml === '' || totalCalculated !== tx.amount)",
  "if (lineItemsHtml === '' || Number(totalCalculated) !== Number(tx.amount))"
);

fs.writeFileSync('lib/generate-invoice.ts', code);
console.log('Fixed!');
