'use client';

export function Footer() {
  return (
    <footer className="w-full bg-slate-900 dark:bg-black py-16 text-slate-400 dark:text-slate-500 transition-colors duration-500 border-t border-slate-200 dark:border-white/5">
      <div className="container mx-auto px-6 md:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          {/* Tentang Kami Section */}
          <div className="flex flex-col gap-4">
            <h3 className="text-lg font-black uppercase tracking-wider text-white">About Us</h3>
            <nav className="flex flex-col gap-2">
              <a href="#about" className="text-sm transition hover:text-white hover:underline">
                What is Fresh Creative?
              </a>
              <a href="#demo-ebook" className="text-sm transition hover:text-white hover:underline">
                Try Demo Product
              </a>
            </nav>
          </div>

          {/* Bantuan Section */}
          <div className="flex flex-col gap-4">
            <h3 className="text-lg font-black uppercase tracking-wider text-white">Support</h3>
            <nav className="flex flex-col gap-2">
              <a href="mailto:admin@livephoto.id" className="text-sm transition hover:text-white hover:underline">
                Contact Us
              </a>
              <a href="/privacy-policy" className="text-sm transition hover:text-white hover:underline">
                Privacy Policy
              </a>
            </nav>
          </div>

          {/* Address Section */}
          <div className="col-span-1 md:col-span-2 lg:col-span-2 flex flex-col gap-4">
            <h3 className="text-lg font-black uppercase tracking-wider text-white">Fresh Creative Indonesia</h3>
            <div className="max-w-md text-sm leading-relaxed">
              <p>
                Jl. Tentara Pelajar No.18, Mangunsari, Kec. Sidomukti, Kota Salatiga, Jawa Tengah 50721
              </p>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-200 dark:border-white/10 flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-medium uppercase tracking-widest">
          <p>
            © {new Date().getFullYear()} Fresh Creative Indonesia. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
