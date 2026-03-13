'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const FAQ_ITEMS = [
  {
    q: 'Ini beneran gratis buat panitia?',
    a: 'Beneran dong! Panitia bisa pakai dashboard manajemen data kami 100% gratis. Bayarnya nanti aja pas siswa mau cetak buku atau download foto HD.',
  },
  {
    q: 'AI-nya bisa gaya apa aja?',
    a: 'Banyak banget! Mulai dari style Yearbook 90s, Korea, Cyberpunk, sampai Professional LinkedIn headshot. Semua otomatis!',
  },
  {
    q: 'Kalo mau cetak buku fisik bisa?',
    a: 'Bisa banget! Kami spesialis Phygital (Physical + Digital). Bukunya premium, covernya bisa custom, plus ada fitur AR-nya.',
  },
  {
    q: 'Datanya aman gak nih?',
    a: 'Aman 100%. Kami pakai enkripsi standar industri dan server aman. Foto siswa gak bakal bocor ke mana-mana.',
  },
  {
    q: 'Berapa lama proses produksinya?',
    a: 'Untuk digital cuma butuh waktu hitungan hari setelah data lengkap. Untuk buku fisik biasanya 3-4 minggu tergantung antrian cetak.',
  },
];

export function FAQ() {
  const [openId, setOpenId] = useState<number | null>(0);

  return (
    <section id="faq" className="w-full bg-[#0d0d0d] py-16 md:py-24">
      <div className="container mx-auto px-4 md:px-8">
        <div className="text-center mb-12">
          <h2 className="font-zentry text-3xl font-black uppercase md:text-4xl text-white">
            Yang Sering Ditanyain
          </h2>
          <p className="font-zentry text-xl font-black uppercase md:text-2xl mt-1 text-lime-400/90">
            (FAQ)
          </p>
        </div>

        <div className="mx-auto max-w-3xl space-y-3">
          {FAQ_ITEMS.map((item, id) => {
            const isOpen = openId === id;
            return (
              <div
                key={id}
                className={cn(
                  'rounded-xl border transition-colors',
                  isOpen ? 'border-lime-400/50 bg-[#141414]' : 'border-white/10 bg-[#141414]/80'
                )}
              >
                <button
                  type="button"
                  onClick={() => setOpenId(isOpen ? null : id)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                >
                  <span className="font-general text-sm font-bold text-white md:text-base">
                    {item.q}
                  </span>
                  <ChevronDown
                    className={cn(
                      'h-5 w-5 shrink-0 text-lime-400 transition-transform duration-200',
                      isOpen && 'rotate-180'
                    )}
                  />
                </button>
                <div
                  className={cn(
                    'grid transition-all duration-200 ease-out',
                    isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                  )}
                >
                  <div className="overflow-hidden">
                    <p className="px-5 pb-4 pt-0 font-general text-sm leading-relaxed text-white/80">
                      {item.a}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
