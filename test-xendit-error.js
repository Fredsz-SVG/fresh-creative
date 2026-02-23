const { Xendit } = require('xendit-node');
const xendit = new Xendit({ secretKey: 'xnd_development_invalid' });

async function run() {
    try {
        await xendit.Invoice.createInvoice({
            data: {
                externalId: 'test_123',
                amount: 10000,
                description: 'Test'
            }
        });
    } catch (error) {
        console.error("XENDIT ERROR STATUS:", error.status);
        console.error("XENDIT ERROR MSG:", error.message);
        console.error("XENDIT ERROR ERRORS:", error.errors);
        console.error("XENDIT ERROR RESPONSE:", error.response);
    }
}
run();
