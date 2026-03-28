'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnimatedTitle } from './AnimatedTitle';

const FAQ_ITEMS = [
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
    <section id="faq" className="w-full bg-slate-100 dark:bg-slate-950 py-16 md:py-24 transition-colors duration-500">
      <div className="container mx-auto px-4 md:px-8">
        <div className="text-center sm:text-left mb-12 sm:mb-16">
          <p className="font-general text-[10px] sm:text-xs uppercase tracking-[0.2em] text-lime-600 dark:text-lime-400 font-black mb-3">
            FAQ
          </p>
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 dark:text-white tracking-tight uppercase">
            Yang Sering <br className="hidden lg:block" /><span className="text-emerald-500">Ditanyain.</span>
          </h2>
          <p className="mt-4 sm:mt-6 text-sm sm:text-base font-medium text-slate-600 dark:text-slate-400 max-w-2xl mx-auto sm:mx-0">
            Masih ada yang bingung? Mungkin jawaban yang kamu cari ada di sini.
          </p>
        </div>

        <div className="mx-auto max-w-3xl space-y-3">
          {FAQ_ITEMS.map((item, id) => {
            const isOpen = openId === id;
            return (
              <div
                key={id}
                className={cn(
                  'rounded-xl border transition-all duration-300',
                  isOpen
                    ? 'border-lime-500/50 dark:border-lime-400/50 bg-white dark:bg-slate-900 shadow-sm'
                    : 'border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/80'
                )}
              >
                <button
                  type="button"
                  onClick={() => setOpenId(isOpen ? null : id)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                >
                  <span className="font-general text-sm font-bold text-slate-800 dark:text-white md:text-base">
                    {item.q}
                  </span>
                  <ChevronDown
                    className={cn(
                      'h-5 w-5 shrink-0 text-lime-600 dark:text-lime-400 transition-transform duration-200',
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
                    <p className="px-5 pb-4 pt-0 font-general text-sm leading-relaxed text-slate-600 dark:text-white/80">
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
