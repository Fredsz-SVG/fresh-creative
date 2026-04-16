const fs = require('fs');
const filePath = 'components/albums/AlbumsView.tsx';
let code = fs.readFileSync(filePath, 'utf-8');

if(!code.includes('individual_payments_enabled?: number | null;')) {
    code = code.replace(/source\?: string\n  total_estimated_price\?: number\n  payment_status\?: 'unpaid' \| 'paid'/, "source?: string\n  total_estimated_price?: number\n  individual_payments_enabled?: number | null;\n  payment_status?: 'unpaid' | 'paid'");
    
    // In case the spacing was different
    code = code.replace(/source\?: string\s*total_estimated_price\?: number\s*payment_status\?: 'unpaid' \| 'paid'/, "source?: string\n  total_estimated_price?: number\n  individual_payments_enabled?: number | null;\n  payment_status?: 'unpaid' | 'paid'");
}

fs.writeFileSync(filePath, code, 'utf-8');
console.log('Fixed Type definition');
