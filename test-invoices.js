require('dotenv').config({ path: '.env.local' })
const { Xendit } = require('xendit-node');

const x = new Xendit({ secretKey: process.env.XENDIT_SECRET_KEY });
async function run() {
    const invs = await x.Invoice.getInvoices({ limit: 1 });
    console.log(JSON.stringify(invs, null, 2));
}
run();
