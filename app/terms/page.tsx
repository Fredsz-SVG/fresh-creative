import Link from 'next/link'
import { Button } from '@/components/ui/button'

export const metadata = {
  title: 'Syarat & Ketentuan - FreshCreative.ID',
  description: 'Syarat dan ketentuan layanan FreshCreative.ID',
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      <main className="max-w-4xl mx-auto px-4 pt-16 pb-16">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 md:p-12 shadow-sm">
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white mb-8">Syarat & Ketentuan</h1>
          
          <div className="prose prose-slate dark:prose-invert max-w-none space-y-8 text-slate-600 dark:text-slate-300">
            <section>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-3">1. Pendahuluan</h2>
              <p>Dengan menggunakan layanan FreshCreative.ID, Anda menyetujui untuk terikat oleh syarat dan ketentuan ini. Silakan baca dengan seksama sebelum menggunakan layanan kami.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-3">2. Layanan</h2>
              <p>Kami menyediakan berbagai layanan desain dan kreatif. Detail layanan, termasuk revisi, waktu pengerjaan, dan spesifikasi akhir, akan disepakati bersama sebelum pengerjaan dimulai.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-3">3. Kewajiban Pengguna</h2>
              <p>Anda setuju untuk memberikan informasi yang akurat dan menggunakan layanan kami sesuai dengan hukum yang berlaku. Anda tidak diperkenankan menggunakan karya kami untuk tujuan ilegal atau melanggar hak pihak lain.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-3">4. Hak Kekayaan Intelektual</h2>
              <p>Semua hasil karya yang belum dibayar lunas tetap menjadi hak milik penuh FreshCreative.ID. Setelah pelunasan, hak cipta atas karya desain akan diserahkan sesuai dengan kesepakatan tertulis.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-3">5. Pembayaran</h2>
              <p>Pembayaran harus dilakukan sesuai dengan termin yang telah disepakati (misal: Uang Muka 50% dan Pelunasan 50%). Keterlambatan pembayaran dapat mengakibatkan penundaan penyelesaian atau pengiriman file proyek.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-3">6. Pembatalan</h2>
              <p>Pembatalan sepihak oleh klien dapat mengakibatkan hangusnya uang muka (DP) yang telah dibayarkan sebagai kompensasi atas waktu dan upaya yang telah dialokasikan.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-3">7. Privasi & Keamanan Data</h2>
              <p>Kami berupaya semaksimal mungkin untuk menjaga kerahasiaan dan keamanan data pribadi maupun data perusahaan Anda, serta tidak akan membagikannya kepada pihak ketiga tanpa persetujuan eksplisit dari Anda. Namun demikian, FreshCreative.ID tidak bertanggung jawab atas kerugian, kerusakan, atau kebocoran data yang diakibatkan oleh hal-hal di luar kendali wajar kami, seperti kelalaian pengguna, peretasan, atau serangan siber (cyber-attacks) pada infrastruktur pihak ketiga.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-3">8. Perubahan Syarat</h2>
              <p>Kami berhak untuk mengubah atau memperbarui syarat dan ketentuan ini kapan saja. Setiap perubahan material akan kami informasikan kepada klien yang sedang memiliki proyek aktif bersama kami.</p>
            </section>
          </div>

          <div className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-800 flex justify-end">
            <Button asChild className="bg-sky-500 hover:bg-sky-600 text-white font-bold h-11 px-8">
              <Link href="/login">Kembali ke Halaman Login</Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}
