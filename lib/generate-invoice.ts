import { getCurrentUser } from './auth-client'

export type InvoiceTransaction = {
  id: string
  external_id?: string
  amount: number
  status: string
  created_at: string
  payment_method?: string | null
  album_name?: string | null
  description?: string | null
  credits?: number | null
  user_full_name?: string
  user_email?: string
  package_snapshot?: string | null
  new_students_count?: number | null
}

export async function generateAndPrintInvoice(tx: InvoiceTransaction) {
  const invoiceId = tx.external_id || tx.id
  const dateStr = new Date(tx.created_at).toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const paymentMethod = tx.payment_method
    ? tx.payment_method.replace(/_/g, ' ').toUpperCase()
    : 'TRANSFER / LAINNYA'

  let desc = 'Pembayaran Platform Fresh'
  if (tx.description) {
    desc = tx.description
  } else if (tx.album_name) {
    desc = `Pembayaran Album: ${tx.album_name}`
  } else if (tx.credits != null) {
    desc = `Top Up ${tx.credits} Credits`
  } else {
    desc = 'Top Up Credit'
  }

  let finalName = tx.user_full_name
  let finalEmail = tx.user_email

  if (!finalName || !finalEmail) {
    try {
      const user = getCurrentUser()
      if (user) {
        if (!finalName) {
          finalName = user.displayName || user.email || undefined
        }
        if (!finalEmail) {
          finalEmail = user.email || undefined
        }
      }
    } catch (err) {
      console.error('Failed to fetch user for invoice:', err)
    }
  }

  const printedName = finalName || 'Pelanggan Fresh'
  const itemsQuantity = tx.new_students_count ? Number(tx.new_students_count) : 1
  const parsedAmount = Number(tx.amount)

  const formatMoney = (value: number) => `Rp ${value.toLocaleString('id-ID')}`
  const lineItems: Array<{ name: string; quantity: number; total: number }> = []

  try {
    if (tx.package_snapshot) {
      const pkg = JSON.parse(tx.package_snapshot)
      const qty = Number.isFinite(itemsQuantity) && itemsQuantity > 0 ? itemsQuantity : 1

      if (pkg?.price_per_student != null) {
        const basePrice = Number(pkg.price_per_student)
        if (Number.isFinite(basePrice) && basePrice > 0) {
          lineItems.push({
            name: `Paket Dasar${pkg.name ? `: ${pkg.name}` : ''}`,
            quantity: qty,
            total: basePrice * qty,
          })
        }
      }

      if (Array.isArray(pkg?.features)) {
        for (const feature of pkg.features) {
          try {
            const addon = typeof feature === 'string' ? JSON.parse(feature) : feature
            const addonPrice = Number(addon?.price)
            if (Number.isFinite(addonPrice) && addonPrice > 0) {
              lineItems.push({
                name: `↳ Add-on: ${addon?.name || 'Add-on'}`,
                quantity: qty,
                total: addonPrice * qty,
              })
            }
          } catch {
            // ignore a single malformed addon entry and keep the rest
          }
        }
      }
    }
  } catch {
    // ignore snapshot parse error and fall back to a single row below
  }

  const renderedLineItems = lineItems.length
    ? lineItems.map((item) => `
          <tr>
            <td>${item.name}</td>
            <td class="text-right">${item.quantity}</td>
            <td class="text-right" style="white-space: nowrap;">${formatMoney(item.total)}</td>
          </tr>`).join('')
    : `<tr>
          <td>${desc}</td>
          <td class="text-right">1</td>
          <td class="text-right" style="white-space: nowrap;">${formatMoney(parsedAmount)}</td>
        </tr>`

  const html = `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <base href="${window.location.origin}/">
  <title>invoices-${invoiceId}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;900&display=swap');
    body { font-family: 'Inter', sans-serif; background: #f3f4f6; color: #1f2937; padding: 2rem; margin: 0; line-height: 1.5; }
    .container { max-width: 48rem; margin: 0 auto; background: #fff; padding: 2.5rem; border-radius: 0.75rem; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); border: 1px solid #e5e7eb; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #e0e7ff; padding-bottom: 2rem; margin-bottom: 2rem; }
    .logo-container { display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem; }
    .logo { height: 2.5rem; width: auto; object-fit: contain; }
    .title { font-size: 1.5rem; font-weight: 900; color: #1e293b; line-height: 1.1; margin: 0; }
    .subtext { font-size: 0.875rem; font-weight: 500; color: #64748b; margin: 0.25rem 0; }
    .email { font-size: 0.875rem; font-weight: 700; color: #4f46e5; margin: 0; }
    .inv-cont { text-align: right; }
    .inv-title { font-size: 2rem; font-weight: 900; color: #4f46e5; letter-spacing: 0.1em; text-transform: uppercase; margin: 0; }
    .inv-no { font-size: 0.875rem; color: #64748b; margin-top: 0.5rem; background: #f1f5f9; padding: 0.375rem 0.75rem; border-radius: 0.5rem; display: inline-block; font-weight: 700; font-family: monospace; }
    .grid-info { display: flex; justify-content: space-between; margin-bottom: 2rem; gap: 2rem; }
    .info-right { text-align: right; }
    .label { font-size: 0.75rem; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.1em; margin: 0 0 0.25rem 0; }
    .val-main { font-size: 1rem; font-weight: 700; color: #0f172a; margin: 0; text-transform: capitalize; }
    .val-sub { font-size: 0.875rem; color: #475569; margin: 0; }
    .mt-4 { margin-top: 1.5rem; }
    .status-badge { display: inline-block; padding: 0.5rem 1rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; border: 2px solid; margin-bottom: 2rem; }
    .status-success { background: #d1fae5; color: #047857; border-color: #a7f3d0; }
    .status-pending { background: #ffedd5; color: #c2410c; border-color: #fed7aa; }
    table { width: 100%; text-align: left; margin-bottom: 2rem; border-collapse: collapse; }
    th { padding: 0.75rem 0; font-size: 0.75rem; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 2px solid #e5e7eb; }
    td { padding: 1rem 0; font-weight: 500; color: #1e293b; border-bottom: 1px solid #f3f4f6; }
    .text-right { text-align: right; }
    .totals { display: flex; justify-content: flex-end; margin-bottom: 2rem; }
    .totals-box { width: 20rem; }
    .tot-row { display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 0; border-bottom: 1px solid #e5e7eb; }
    .tot-label { font-size: 0.875rem; font-weight: 700; color: #6b7280; text-transform: uppercase; }
    .tot-val { font-size: 1rem; font-weight: 700; color: #0f172a; }
    .tot-row.final { padding: 1rem 0; border: none; }
    .tot-label.final { font-size: 1.125rem; font-weight: 800; color: #0f172a; }
    .tot-val.final { font-size: 1.5rem; font-weight: 900; color: #4f46e5; }
    .footer { border-top: 2px solid #e5e7eb; padding-top: 2rem; text-align: center; }
    .footer-1 { font-size: 0.875rem; color: #6b7280; font-weight: 500; margin: 0; }
    .footer-2 { font-size: 0.75rem; color: #9ca3af; margin-top: 0.5rem; }
    @media print {
      @page { margin: 0; }
      body { background: transparent; padding: 0; }
      .container { box-shadow: none; border: none; padding: 2rem; max-width: 100%; }
      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <div>
        <div class="logo-container">
          <img src="${window.location.origin}/img/logo.webp" alt="Logo" class="logo" />
          <h2 class="title">Fresh Creative<br/>Indonesia</h2>
        </div>
        <p class="subtext">Platform Pembuatan Buku Kenangan Digital</p>
        <p class="email">admin@freshcreative.id</p>
      </div>
      <div class="inv-cont">
        <h1 class="inv-title">INVOICE</h1>
        <div class="inv-no">#${invoiceId}</div>
      </div>
    </div>

    <!-- Informational Grid -->
    <div class="grid-info">
      <div>
        <p class="label">BUKTI PEMBAYARAN KEPADA</p>
        <p class="val-main">${printedName}</p>
        ${finalEmail ? `<p class="val-sub">${finalEmail}</p>` : ''}
      </div>
      <div class="info-right">
        <p class="label">TANGGAL TRANSAKSI</p>
        <p class="val-main">${dateStr}</p>
        
        <p class="label mt-4">METODE PEMBAYARAN</p>
        <p class="val-main">${paymentMethod}</p>
      </div>
    </div>

    <!-- Status Badge -->
    <div class="status-badge ${(tx.status === 'PAID' || tx.status === 'SETTLED') ? 'status-success' : 'status-pending'}">
      STATUS: ${(tx.status === 'PAID' || tx.status === 'SETTLED') ? 'SUKSES' : tx.status}
    </div>

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
        ${renderedLineItems}
      </tbody>
    </table>

    <!-- Totals -->
    <div class="totals">
      <div class="totals-box">
        <div class="tot-row final">
          <span class="tot-label final">Total Dibayar</span>
          <span class="tot-val final">${formatMoney(parsedAmount)}</span>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <p class="footer-1">Terima kasih atas pembayaran Anda!</p>
      <p class="footer-2">Dokumen ini merupakan bukti pembayaran yang sah dan diterbitkan oleh sistem secara otomatis.</p>
    </div>
  </div>
</body>
</html>
  `

  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  document.body.appendChild(iframe);
  iframe.contentWindow?.document.open();
  iframe.contentWindow?.document.write(html);
  iframe.contentWindow?.document.close();

  // Fix: To ensure the downloaded filename is "invoices-XXX.pdf" instead of parent page title
  const originalTitle = document.title;
  document.title = `invoices-${invoiceId}`;

  // Wait long enough for images to load before printing
  setTimeout(() => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => {
      document.title = originalTitle;
      document.body.removeChild(iframe);
    }, 1000);
  }, 1000);
}
