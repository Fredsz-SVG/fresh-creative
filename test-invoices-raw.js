require('dotenv').config({ path: '.env.local' })

async function run() {
    const auth = Buffer.from(process.env.XENDIT_SECRET_KEY + ':').toString('base64');
    const res = await fetch('https://api.xendit.co/v2/invoices?limit=1', {
        headers: { 'Authorization': 'Basic ' + auth }
    });
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
}
run();
