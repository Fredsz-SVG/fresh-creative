const { Xendit } = require('xendit-node');
const xendit = new Xendit({ secretKey: 'xnd_development_123' });
console.log(typeof xendit.Invoice.createInvoice);
