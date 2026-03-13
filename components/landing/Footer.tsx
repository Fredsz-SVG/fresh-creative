'use client';

const FOOTER_LINKS = [
  { label: "Tentang Kami", href: "#about" },
  { label: "Apa itu Fresh Creative?", href: "#about" },
  { label: "Coba Produk Demo", href: "#demo-ar" },
  { label: "Bantuan", href: "#" },
  { label: "Hubungi Kami", href: "#contact" },
  { label: "Privacy Policy", href: "#" },
];

export function Footer() {
  return (
    <footer className="w-full bg-violet-300 py-10 text-violet-50">
      <div className="container mx-auto px-6 md:px-8">
        <nav className="mb-8 flex flex-wrap justify-center gap-x-8 gap-y-2 md:justify-start">
          {FOOTER_LINKS.map(({ label, href }) => (
            <a
              key={label}
              href={href}
              className="text-sm transition hover:underline hover:opacity-90"
            >
              {label}
            </a>
          ))}
        </nav>

        <div className="mb-6 max-w-2xl text-center text-sm md:text-left">
          <p className="font-semibold">PT Indonesia Creative Technology</p>
          <p className="mt-1 text-violet-100">
            AD PREMIER Lantai 17 SUITE 04 B, Jalan TB. SIMATUPANG NOMOR 5,
            Desa/Kelurahan Ragunan, Kec. Pasar Minggu, Kota Adm. Jakarta Selatan
          </p>
        </div>

        <p className="text-center text-sm text-violet-100 md:text-left">
          © {new Date().getFullYear()} Fresh Creative Indonesia. All rights
          reserved.
        </p>
      </div>
    </footer>
  );
}
