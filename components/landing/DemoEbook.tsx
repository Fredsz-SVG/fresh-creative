'use client';

import { useState, useEffect, useCallback } from 'react';
import { GalleryHorizontal, BookMarked, X, Loader2 } from 'lucide-react';
import { AnimatedCarouselMockup, AnimatedFlipbookMockup } from '../dashboard/AnimatedMockups';
import { AnimatedTitle } from './AnimatedTitle';
import Link from 'next/link';
import { apiUrl } from '@/lib/api-url';

type ShowcaseAlbumPreview = {
  title: string
  imageUrl?: string
  link: string
}

export function DemoEbook() {
  const [showcaseLoading, setShowcaseLoading] = useState(true);
  const [albumPreviews, setAlbumPreviews] = useState<ShowcaseAlbumPreview[]>([]);
  const [flipbookPreviewUrl, setFlipbookPreviewUrl] = useState('');
  const [showCarouselPreview, setShowCarouselPreview] = useState(false);

  const fetchShowcase = useCallback(async () => {
    setShowcaseLoading(true);
    try {
      const res = await fetch(apiUrl('/api/showcase'), { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data) {
        setAlbumPreviews(Array.isArray(data.albumPreviews) ? data.albumPreviews : []);
        setFlipbookPreviewUrl(typeof data.flipbookPreviewUrl === 'string' ? data.flipbookPreviewUrl : '');
      }
    } catch (error) {
      console.error('Failed to fetch showcase:', error);
    } finally {
      setShowcaseLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchShowcase();
  }, [fetchShowcase]);

  return (
    <section id="demo-ebook" className="w-full bg-slate-100 dark:bg-slate-950 py-24 transition-colors duration-500">
      <div className="container mx-auto px-6 md:px-8">
        <div className="flex flex-col items-center mb-16 text-center">
          <p className="font-general text-base uppercase md:text-lg text-black/60 dark:text-white/60 mb-4">
            Pengalaman Digital Masa Depan
          </p>
          <AnimatedTitle containerClass="!text-black dark:!text-white text-center font-zentry">
            {"Eksplorasi E-Book <br /> Interaktif"}
          </AnimatedTitle>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Card Swipe Demo */}
          <div className="group rounded-[2rem] border-2 border-slate-900 bg-white dark:bg-slate-900 dark:border-white shadow-[4px_4px_0_0_#0f172a] dark:shadow-[4px_4px_0_0_#fff] overflow-hidden hover:-translate-y-0.5 hover:-translate-x-0.5 hover:shadow-[6px_6px_0_0_#0f172a] dark:hover:shadow-[6px_6px_0_0_#fff] transition-all duration-300 flex flex-col">
            <div className="p-8 border-b-2 border-slate-900 dark:border-white flex flex-col items-center justify-center bg-white dark:bg-slate-900 relative z-10 w-full text-center">
              <div className="shrink-0 w-14 h-14 mb-4 rounded-2xl bg-orange-50 dark:bg-orange-500/10 border-2 border-slate-900 dark:border-white shadow-[2px_2px_0_0_#0f172a] dark:shadow-[2px_2px_0_0_#fff] flex items-center justify-center">
                <GalleryHorizontal className="w-7 h-7 text-orange-500" />
              </div>
              <h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">Interactive Swipe</h3>
              <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mt-2">Geser untuk pengalaman eksplorasi profil yang intuitif dan modern.</p>
            </div>
            
            <div 
              className="relative p-12 flex flex-col items-center justify-center min-h-[400px] overflow-hidden bg-slate-50/50 dark:bg-slate-950/50 cursor-pointer"
              onClick={() => albumPreviews.length > 0 && setShowCarouselPreview(true)}
            >
              <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-40" />
              
              {showcaseLoading ? (
                <div className="relative z-10 w-48 aspect-[3/4] bg-white dark:bg-slate-800 rounded-2xl border-2 border-slate-900 dark:border-white flex items-center justify-center animate-pulse">
                  <Loader2 className="w-8 h-8 animate-spin text-slate-300 dark:text-slate-600" />
                </div>
              ) : (
                <div className="relative z-10 w-full transform group-hover:scale-105 transition-transform duration-500 flex justify-center">
                  <AnimatedCarouselMockup imageUrl={albumPreviews[0]?.imageUrl} />
                  {albumPreviews.length > 0 && (
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                      <div className="px-6 py-3 bg-slate-900/90 dark:bg-white/90 backdrop-blur-md rounded-full text-white dark:text-black text-sm font-black shadow-xl flex items-center gap-2 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                        <GalleryHorizontal className="w-4 h-4 text-orange-400 dark:text-orange-600" />
                        <span>Buka Carousel</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Fullscreen Overlay for Carousel Preview */}
          {showCarouselPreview && albumPreviews[0] && (
            <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex flex-col">
              <div className="absolute top-6 right-6 z-[110]">
                <button
                  onClick={() => setShowCarouselPreview(false)}
                  className="w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white backdrop-blur-md transition-all border border-white/20"
                >
                  <X className="w-8 h-8" />
                </button>
              </div>
              <div className="flex-1 w-full h-full relative">
                {(() => {
                  const item = albumPreviews[0];
                  const idMatch = item.link.match(/(?:album|yearbook)\/([^/?]+)/);
                  const embedUrl = idMatch ? `/album/${idMatch[1]}/preview` : item.link;
                  return (
                    <iframe
                      src={embedUrl}
                      className="w-full h-full border-0 absolute inset-0 bg-transparent"
                      allow="fullscreen; autoplay; encrypted-media"
                      allowFullScreen
                      title="Album Carousel Preview"
                    />
                  );
                })()}
              </div>
            </div>
          )}

          {/* Flipbook Demo */}
          <div className="group rounded-[2rem] border-2 border-slate-900 bg-white dark:bg-slate-900 dark:border-white shadow-[4px_4px_0_0_#0f172a] dark:shadow-[4px_4px_0_0_#fff] overflow-hidden hover:-translate-y-0.5 hover:-translate-x-0.5 hover:shadow-[6px_6px_0_0_#0f172a] dark:hover:shadow-[6px_6px_0_0_#fff] transition-all duration-300 flex flex-col">
            <div className="p-8 border-b-2 border-slate-900 dark:border-white flex flex-col items-center justify-center bg-white dark:bg-slate-900 relative z-10 w-full text-center">
              <div className="shrink-0 w-14 h-14 mb-4 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border-2 border-slate-900 dark:border-white shadow-[2px_2px_0_0_#0f172a] dark:shadow-[2px_2px_0_0_#fff] flex items-center justify-center">
                <BookMarked className="w-7 h-7 text-emerald-500" />
              </div>
              <h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">3D Virtual Flipbook</h3>
              <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mt-2">Rasakan sensasi membalik halaman fisik dalam format digital yang nyata.</p>
            </div>
            
            <div className="relative p-12 flex flex-col items-center justify-center min-h-[400px] overflow-hidden bg-slate-50/50 dark:bg-slate-950/50">
              <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-40" />
              
              {showcaseLoading ? (
                <div className="relative z-10 w-64 aspect-[4/3] bg-white dark:bg-slate-800 rounded-xl border-2 border-slate-900 dark:border-white flex items-center justify-center animate-pulse">
                  <Loader2 className="w-8 h-8 animate-spin text-slate-300 dark:text-slate-600" />
                </div>
              ) : (
                <div className="relative z-10 w-full transform group-hover:scale-105 transition-transform duration-500 flex justify-center">
                  {flipbookPreviewUrl ? (
                    <div className="relative w-full flex justify-center">
                      {flipbookPreviewUrl.startsWith('/') ? (
                        <Link href={flipbookPreviewUrl} className="block w-full relative group/btn">
                          <AnimatedFlipbookMockup />
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                            <div className="px-6 py-3 bg-slate-900/90 backdrop-blur-md rounded-full text-white text-sm font-black shadow-xl flex items-center gap-2 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                              <BookMarked className="w-4 h-4 text-emerald-400" />
                              <span>Buka Flipbook</span>
                            </div>
                          </div>
                        </Link>
                      ) : (
                        <a href={flipbookPreviewUrl} className="block w-full relative group/btn">
                          <AnimatedFlipbookMockup />
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                            <div className="px-6 py-3 bg-slate-900/90 backdrop-blur-md rounded-full text-white text-sm font-black shadow-xl flex items-center gap-2 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                              <BookMarked className="w-4 h-4 text-emerald-400" />
                              <span>Buka Flipbook</span>
                            </div>
                          </div>
                        </a>
                      )}
                    </div>
                  ) : (
                    <div className="opacity-50 grayscale">
                      <AnimatedFlipbookMockup />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
