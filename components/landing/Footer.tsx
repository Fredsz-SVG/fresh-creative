'use client';

export function Footer() {
  return (
    <footer className="w-full bg-slate-900 dark:bg-black py-16 text-slate-400 dark:text-slate-500 transition-colors duration-500 border-t border-slate-800 dark:border-white/5">
      <div className="container mx-auto px-6 md:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          {/* Tentang Kami Section */}
          <div className="flex flex-col gap-4">
            <h3 className="text-lg font-black uppercase tracking-wider text-white">Tentang Kami</h3>
            <nav className="flex flex-col gap-2">
              <a href="#about" className="text-sm transition hover:text-white hover:underline">
                Apa itu Fresh Creative?
              </a>
              <a href="#demo-ebook" className="text-sm transition hover:text-white hover:underline">
                Coba Produk Demo
              </a>
            </nav>
          </div>

          {/* Bantuan Section */}
          <div className="flex flex-col gap-4">
            <h3 className="text-lg font-black uppercase tracking-wider text-white">Bantuan</h3>
            <nav className="flex flex-col gap-2">
              <a href="mailto:admin@livephoto.id" className="text-sm transition hover:text-white hover:underline">
                Hubungi Kami
              </a>
              <a href="/privacy-policy" className="text-sm transition hover:text-white hover:underline">
                Privacy Policy
              </a>
            </nav>
          </div>

          {/* Address Section */}
          <div className="col-span-1 md:col-span-2 lg:col-span-2 flex flex-col gap-4">
            <h3 className="text-lg font-black uppercase tracking-wider text-white">PT Indonesia Creative Technology</h3>
            <div className="max-w-md text-sm leading-relaxed">
              <p>
                AD PREMIER Lantai 17 SUITE 04 B, Jalan TB. SIMATUPANG NOMOR 5,
                Desa/Kelurahan Ragunan, Kec. Pasar Minggu, Kota Adm. Jakarta Selatan
              </p>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-800 dark:border-white/10 flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-medium uppercase tracking-widest">
          <p>
            © {new Date().getFullYear()} Fresh Creative Indonesia. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
