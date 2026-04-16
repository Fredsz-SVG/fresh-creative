const fs = require('fs');
const filePath = 'components/albums/AlbumsView.tsx';
let code = fs.readFileSync(filePath, 'utf-8');

// More flexible whitespace matching
code = code.replace(
  /const isPaid = album\.payment_status === 'paid'\s*const isApproved = album\.status === 'approved'/g,
  "const isPaid = album.payment_status === 'paid'\n    const isIndividualPayment = album.individual_payments_enabled === 1\n    const isApproved = album.status === 'approved'"
);

fs.writeFileSync(filePath, code, 'utf-8');
console.log('Fixed undefined vars everywhere');
