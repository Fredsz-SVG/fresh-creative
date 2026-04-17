const fs = require('fs');

let code = fs.readFileSync('hono-backend/routes/albums/id/checkout.ts', 'utf-8');

const targetRegex = /const invoicePayload: Record<string, unknown> = \{\s*external_id: externalId,\s*amount: amount,\s*currency: 'IDR',\s*description: desc,\s*success_redirect_url: \\\\\\$\\\{baseUrl\}\\\$\\\{redirectPath\\\}\\\?status=success\\\,\s*failure_redirect_url: \\\\\\$\\\{baseUrl\}\\\$\\\{redirectPath\\\}\\\?status=failed\\\,\s*items: \[\s*\{\s*name: \\\\\\$\\\{album\.name\\\} Album Payment\\\,\s*quantity: 1,\s*price: amount,\s*\},\s*\],\s*\}/m;

const replaceStr = \
      let itemsQuantity = isUpgradeRequest ? (body.added_students || 1) : 1;
      let lineItems = [];
      let totalCalculated = 0;

      try {
        if (album.package_snapshot) {
          const pkg = JSON.parse(album.package_snapshot);
          
          if (pkg.price_per_student) {
            const baseP = Number(pkg.price_per_student);
            lineItems.push({
              name: \\\Paket Dasar: \\\\\\,
              quantity: itemsQuantity,
              price: baseP,
            });
            totalCalculated += baseP * itemsQuantity;
          }

          if (pkg.features && Array.isArray(pkg.features)) {
            for (const f of pkg.features) {
              try {
                const j = typeof f === 'string' ? JSON.parse(f) : f;
                if (j.price > 0 || Number(j.price) > 0) {
                  const addonP = Number(j.price);
                  lineItems.push({
                    name: \\\Add-on: \\\\\\,
                    quantity: itemsQuantity,
                    price: addonP,
                  });
                  totalCalculated += addonP * itemsQuantity;
                }
              } catch(e){}
            }
          }
        }
      } catch(e) {}

      if (lineItems.length === 0 || totalCalculated !== amount) {
        lineItems = [
          {
            name: isUpgradeRequest ? \\\Penambahan \\\ Anggota: \\\\\\ : \\\Pembayaran Album: \\\\\\,
            quantity: 1,
            price: amount,
          },
        ];
      }

      const invoicePayload: Record<string, unknown> = {
        external_id: externalId,
        amount: amount,
        currency: 'IDR',
        description: desc,
        success_redirect_url: \\\\\\\\\?status=success\\\,
        failure_redirect_url: \\\\\\\\\?status=failed\\\,
        items: lineItems,
      }
\;

if(targetRegex.test(code)) {
    code = code.replace(targetRegex, replaceStr.trim());
    fs.writeFileSync('hono-backend/routes/albums/id/checkout.ts', code);
    console.log("SUCCESS REPLACE");
} else {
    console.log("NOT MATCH");
}
