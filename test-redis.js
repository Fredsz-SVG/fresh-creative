const Redis = require('ioredis');

// URL dari .env.local
const REDIS_URL = 'rediss://default:AVN7AAIncDJjODIwM2U5YzA0MmU0YjJkYWUzNWU2N2NhZDI2ZTU0MXAyMjEzNzE@star-drake-21371.upstash.io:6379';

console.log('Mencoba menyambungkan ke Redis...');

const redis = new Redis(REDIS_URL, {
    lazyConnect: true // Sama seperti di lib/redis.ts Anda
});

async function testConnection() {
    try {
        // Memaksa koneksi segera
        await redis.connect();
        console.log('✅ KONEKSI BERHASIL: Redis (Upstash) berhasil tersambung!');

        // Testing baca dan tulis sebentar
        await redis.set('test_ping', 'PONG', 'EX', 10);
        const reply = await redis.get('test_ping');
        console.log('Balasan PING dari Redis:', reply);

    } catch (error) {
        console.error('❌ KONEKSI GAGAL. Pesan Error:');
        console.error(error.message);
    } finally {
        // Menutup koneksi agar tidak menggantung
        redis.quit();
    }
}

testConnection();
