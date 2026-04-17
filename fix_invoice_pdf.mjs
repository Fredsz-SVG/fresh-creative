import fs from 'fs';

let code = fs.readFileSync('lib/generate-invoice.ts', 'utf8');

// 1. Update InvoiceTransaction type
if (!code.includes('package_snapshot?: string')) {
  code = code.replace(
    /export type InvoiceTransaction = \{([\s\S]*?)\}/,
    \export type InvoiceTransaction = {\  package_snapshot?: string | null;\n  new_students_count?: number | null;\n}\
  );
}

// 2. Logic to build dynamic line items
const replaceTarget = \    let finalEmail = tx.user_email || ''\;

const dynamicLogic = \
    let finalEmail = tx.user_email || ''

    let lineItemsHtml = ''
    let totalCalculated = 0
    let itemsQuantity = tx.new_students_count ? Number(tx.new_students_count) : 1

    try {
      if (tx.package_snapshot) {
        const pkgStr = String(tx.package_snapshot)
        const pkg = typeof pkgStr === 'string' ? JSON.parse(pkgStr) : pkgStr
        
        if (pkg.price_per_student) {
          const baseP = Number(pkg.price_per_student)
          const rowPrice = baseP * itemsQuantity
          totalCalculated += rowPrice
          lineItemsHtml += \\\<tr><td>Paket Dasar</td><td class="text-right">\\\</td><td class="text-right" style="white-space: nowrap;">Rp \\\</td></tr>\\\
        }

        if (pkg.features && Array.isArray(pkg.features)) {
          for (const f of pkg.features) {
            try {
              const j = typeof f === 'string' ? JSON.parse(f) : f
              if (j.price > 0 || Number(j.price) > 0) {
                const addonP = Number(j.price)
                const rowPrice = addonP * itemsQuantity
                totalCalculated += rowPrice
                lineItemsHtml += \\\<tr><td>&#x21B3; Add-on: \\\</td><td class="text-right">\\\</td><td class="text-right" style="white-space: nowrap;">Rp \\\</td></tr>\\\
              }
            } catch(_e) { /* ignore addon error */ }
          }
        }
      }
    } catch(_err) { /* ignore parse */ }

    if (lineItemsHtml === '' || totalCalculated !== tx.amount) {
      lineItemsHtml = \\\<tr>
        <td>\\\</td>
        <td class="text-right">1</td>
        <td class="text-right" style="white-space: nowrap;">Rp \\\</td>
      </tr>\\\
    }
\;

if (code.includes(replaceTarget)) {
   code = code.replace(replaceTarget, dynamicLogic.trim());
}

// 3. HTML table replacement
const oldTableHtml = \
      <!-- Details Table -->
      <table>
        <thead>
          <tr>
            <th>Deskripsi Item</th>
            <th class="text-right">Jumlah</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>\\\</td>
            <td class="text-right" style="white-space: nowrap;">Rp \\\</td>
          </tr>
        </tbody>
      </table>
\;

const newTableHtml = \
      <!-- Details Table -->
      <table>
        <thead>
          <tr>
            <th>Deskripsi Item</th>
            <th class="text-right">Qty</th>
            <th class="text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          \\\
        </tbody>
      </table>
\;

if (code.includes('<th>Deskripsi Item</th>') && code.includes('<th class="text-right">Jumlah</th>')) {
   code = code.replace(oldTableHtml.trim(), newTableHtml.trim());
}

fs.writeFileSync('lib/generate-invoice.ts', code);
console.log('Fixed PDF template');
