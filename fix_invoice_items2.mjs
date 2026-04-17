import fs from 'fs'
let code = fs.readFileSync('lib/generate-invoice.ts', 'utf-8')

code = code.replace(
  '  credits?: number | null',
  '  credits?: number | null\n  package_snapshot?: string | null\n  new_students_count?: number | null\n  total_students?: number | null'
)

const templateOldHead = \    <!-- Details Table -->
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
    </table>\

const templateNewHead = \    <!-- Details Table -->
    <table>
      <thead>
        <tr>
          <th>Deskripsi Item & Add-on</th>
          <th class="text-right">Qty</th>
          <th class="text-right">Total</th>
        </tr>
      </thead>
      <tbody>
        \\\
      </tbody>
    </table>\

const setupLines = \
  const printedName = finalName || 'Pelanggan Fresh'

  let lineItemsHtml = ''
  if (tx.package_snapshot) {
    try {
      const isUpgrade = desc.toLowerCase().includes('penambahan')
      const qty = isUpgrade ? Math.max(1, Number(tx.new_students_count) || 1) : 1
      const pkg = JSON.parse(tx.package_snapshot)
      
      let calculatedBase = 0
      let calculatedAddons = 0
      
      if (pkg.price_per_student) {
        calculatedBase = Number(pkg.price_per_student) * qty
      }
      
      let addonHtml = ''
      if (pkg.features && Array.isArray(pkg.features)) {
        for (const f of pkg.features) {
          try {
            const j = typeof f === 'string' ? JSON.parse(f) : f
            if (j.price && Number(j.price) > 0) {
              const addonPrice = Number(j.price) * qty
              addonHtml += \\\
                <tr>
                  <td> Add-on: \\\</td>
                  <td class="text-right">\\\</td>
                  <td class="text-right" style="white-space: nowrap;">Rp \\\</td>
                </tr>
              \\\
              calculatedAddons += addonPrice
            }
          } catch(e) {}
        }
      }

      if (calculatedBase + calculatedAddons === tx.amount) {
        lineItemsHtml = \\\
          <tr>
            <td>Paket Dasar: \\\</td>
            <td class="text-right">\\\</td>
            <td class="text-right" style="white-space: nowrap;">Rp \\\</td>
          </tr>
          \\\
        \\\
      }
    } catch(e) {}
  }

  if (!lineItemsHtml) {
    lineItemsHtml = \\\
      <tr>
        <td>\\\</td>
        <td class="text-right">1</td>
        <td class="text-right" style="white-space: nowrap;">Rp \\\</td>
      </tr>
    \\\
  }

  const html = \\\
\

code = code.split("  const printedName = finalName || 'Pelanggan Fresh'")[0] + setupLines + code.split("\n  const html = \")[1];

code = code.replace(
  templateOldHead,
  templateNewHead
)

fs.writeFileSync('lib/generate-invoice.ts', code)
