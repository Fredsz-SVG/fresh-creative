'use client';

import { useState, useEffect, useCallback } from 'react';
import { GalleryHorizontal, BookMarked, X, Loader2 } from 'lucide-react';
import { TiLocationArrow } from 'react-icons/ti';
import { AnimatedCarouselMockup, AnimatedFlipbookMockup } from '../dashboard/AnimatedMockups';
import { AnimatedTitle } from './AnimatedTitle';
import Link from 'next/link';
import { apiUrl } from '@/lib/api-url';
import { asObject, asString } from '@/components/yearbook/utils/response-narrowing';
import { useContext } from 'react';
import { ThemeContext } from '@/app/providers/ThemeProvider';

type ShowcaseAlbumPreview = {
  title: string
  imageUrl?: string
  link: string
}

export function DemoEbook() {
  const [showcaseLoading, setShowcaseLoading] = useState(true);
  const [albumPreviews, setAlbumPreviews] = useState<ShowcaseAlbumPreview[]>([]);
  const [flipbookPreviewUrl, setFlipbookPreviewUrl] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState('');
  const theme = useContext(ThemeContext);

  const fetchShowcase = useCallback(async () => {
    setShowcaseLoading(true);
    try {
      const res = await fetch(apiUrl('/api/showcase'), { cache: 'no-store' });
      const data = asObject(await res.json().catch(() => ({})));
      if (res.ok && data) {
        setAlbumPreviews(Array.isArray(data.albumPreviews) ? data.albumPreviews : []);
        setFlipbookPreviewUrl(asString(data.flipbookPreviewUrl) ?? '');
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

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data === 'CLOSE_YEARBOOK_PREVIEW') {
        setPreviewUrl(null);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  useEffect(() => {
    if (previewUrl) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [previewUrl]);

  return (
    <section id="demo-ebook" className="w-auto bg-slate-100 dark:bg-slate-950 py-16 sm:py-24 transition-colors duration-500 overflow-hidden">
      <div className="container mx-auto px-4 sm:px-8">
        <div className="text-center sm:text-left mb-12 sm:mb-16">
          <p className="font-general text-[10px] sm:text-xs uppercase tracking-[0.2em] text-lime-600 dark:text-lime-400 font-black mb-3">
            Digital Experience
          </p>
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 dark:text-white tracking-tight uppercase">
            Eksplorasi E-Book <br className="hidden lg:block" /><span className="text-orange-500">Interaktif.</span>
          </h2>
          <p className="mt-4 sm:mt-6 text-sm sm:text-base font-medium text-slate-600 dark:text-slate-400 max-w-2xl mx-auto sm:mx-0">
            Pengalaman melihat masa lalu dengan teknologi masa depan yang intuitif.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Card Swipe Demo */}
          <div className="group rounded-[1.5rem] sm:rounded-[2rem] border-2 border-slate-900 bg-white dark:bg-slate-900 dark:border-white shadow-[3px_3px_0_0_#0f172a] dark:shadow-[#a3e635] overflow-hidden hover:-translate-y-0.5 hover:-translate-x-0.5 hover:shadow-[4px_4px_0_0_#0f172a] dark:hover:shadow-[#a3e635] transition-all duration-300 flex flex-col">
            <div className="p-6 sm:p-8 flex flex-col items-center justify-center bg-white dark:bg-slate-900 relative z-10 w-full text-center">
              <div className="shrink-0 w-14 h-14 sm:w-16 sm:h-16 mb-4 sm:mb-5 rounded-2xl bg-orange-400 border-2 border-slate-900 dark:border-white shadow-[2px_2px_0_0_#0f172a] dark:shadow-[2px_2px_0_0_#a3e635] flex items-center justify-center transition-transform group-hover:scale-105 group-hover:-rotate-3">
                <GalleryHorizontal className="w-7 h-7 sm:w-8 sm:h-8 text-slate-900" strokeWidth={2.5} />
              </div>
              <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Interactive Swipe</h3>
              <p className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400 mt-2 max-w-xs mx-auto">Geser untuk pengalaman eksplorasi profil yang intuitif dan super modern.</p>
            </div>
            
            <div 
              className="relative p-6 sm:p-12 flex flex-col items-center justify-center min-h-[300px] sm:min-h-[400px] overflow-hidden bg-slate-50/50 dark:bg-slate-950/50 cursor-pointer"
              onClick={() => {
                if (albumPreviews[0]) {
                  setPreviewUrl(albumPreviews[0].link);
                  setPreviewTitle('Carousel Preview');
                }
              }}
            >
              <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-40" />
              
              {showcaseLoading ? (
                <div className="relative z-10 w-48 aspect-[3/4] bg-white dark:bg-slate-800 rounded-2xl border-2 border-slate-900 dark:border-white flex items-center justify-center animate-pulse">
                  <Loader2 className="w-8 h-8 animate-spin text-slate-300 dark:text-slate-600" />
                </div>
              ) : (
                <div className="relative z-10 w-full transform group-hover:scale-105 transition-all duration-500 flex justify-center">
                  <AnimatedCarouselMockup imageUrl={albumPreviews[0]?.imageUrl} mobileMaxWidthClass="max-w-[170px]" />
                  {/* Desktop Hover Hint */}
                  {albumPreviews.length > 0 && (
                    <div className="absolute inset-0 hidden sm:flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                      <div className="px-6 py-3 bg-slate-900/90 dark:bg-slate-800/90 backdrop-blur-md rounded-full text-white text-sm font-black flex items-center gap-2 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300 border-2 border-slate-900 dark:border-slate-700">
                        <GalleryHorizontal className="w-4 h-4 text-orange-400 dark:text-orange-500" />
                        <span>Buka Carousel</span>
                      </div>
                    </div>
                  )}
                  {/* Mobile Help Badge */}
                  <div className="md:hidden absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-yellow-300 border-2 border-slate-900 shadow-[2px_2px_0_0_#0f172a] rounded-xl text-black text-[10px] font-black uppercase tracking-widest flex items-center gap-2 animate-bounce">
                    <TiLocationArrow className="w-4 h-4 rotate-45" />
                    <span>Klik untuk demo</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Fullscreen Overlay for Previews */}
          {previewUrl && (
            <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex flex-col">
              <div className="flex-1 w-full h-full relative">
                {(() => {
                  // Only transform to /preview if it's a generic album link AND not already a flipbook link
                  const isFlipbook = previewUrl.includes('/flipbook');
                  const idMatch = previewUrl.match(/(?:album|yearbook)\/([^/?]+)/);
                  const baseUrl = (idMatch && !isFlipbook) 
                    ? `/album/${idMatch[1]}/preview` 
                    : previewUrl;
                  
                  // Append theme to the URL
                  const currentTheme = theme?.isDark ? 'dark' : 'light';
                  const connector = baseUrl.includes('?') ? '&' : '?';
                  const embedUrl = `${baseUrl}${connector}embedded=true&theme=${currentTheme}`;
                  
                  return (
                    <iframe
                      src={embedUrl}
                      className="w-full h-full border-0 absolute inset-0 bg-transparent"
                      allow="fullscreen; autoplay; encrypted-media"
                      allowFullScreen
                      title={previewTitle}
                    />
                  );
                })()}
              </div>
            </div>
          )}

          {/* Flipbook Demo */}
          <div className="group rounded-[1.5rem] sm:rounded-[2rem] border-2 border-slate-900 bg-white dark:bg-slate-900 dark:border-white shadow-[3px_3px_0_0_#0f172a] dark:shadow-[#a3e635] overflow-hidden hover:-translate-y-0.5 hover:-translate-x-0.5 hover:shadow-[4px_4px_0_0_#0f172a] dark:hover:shadow-[#a3e635] transition-all duration-300 flex flex-col">
            <div className="p-6 sm:p-8 flex flex-col items-center justify-center bg-white dark:bg-slate-900 relative z-10 w-full text-center">
              <div className="shrink-0 w-14 h-14 sm:w-16 sm:h-16 mb-4 sm:mb-5 rounded-2xl bg-emerald-400 border-2 border-slate-900 dark:border-white shadow-[2px_2px_0_0_#0f172a] dark:shadow-[2px_2px_0_0_#a3e635] flex items-center justify-center transition-transform group-hover:scale-105 group-hover:rotate-3">
                <BookMarked className="w-7 h-7 sm:w-8 sm:h-8 text-slate-900" strokeWidth={2.5} />
              </div>
              <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">3D Virtual Flipbook</h3>
              <p className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400 mt-2 max-w-xs mx-auto">Rasakan sensasi membalik halaman fisik dalam format digital yang nyata.</p>
            </div>
            
            <div className="relative p-6 sm:p-12 flex flex-col items-center justify-center min-h-[300px] sm:min-h-[400px] overflow-hidden bg-slate-50/50 dark:bg-slate-950/50">
              <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-40" />
              
              {showcaseLoading ? (
                <div className="relative z-10 w-64 aspect-[4/3] bg-white dark:bg-slate-800 rounded-xl border-2 border-slate-900 dark:border-white flex items-center justify-center animate-pulse">
                  <Loader2 className="w-8 h-8 animate-spin text-slate-300 dark:text-slate-600" />
                </div>
              ) : (
                <div 
                  className="relative z-10 w-full transform group-hover:scale-105 transition-all duration-500 cursor-pointer"
                  onClick={() => {
                    if (flipbookPreviewUrl) {
                      setPreviewUrl(flipbookPreviewUrl);
                      setPreviewTitle('Flipbook Preview');
                    }
                  }}
                >
                  <div className="relative w-full flex justify-center">
                    <AnimatedFlipbookMockup />
                    <div className="absolute inset-0 hidden sm:flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                      <div className="px-6 py-3 bg-slate-900/90 dark:bg-slate-800/90 backdrop-blur-md rounded-full text-white text-sm font-black flex items-center gap-2 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300 border-2 border-slate-900 dark:border-slate-700">
                        <BookMarked className="w-4 h-4 text-emerald-400" />
                        <span>Buka Flipbook</span>
                      </div>
                    </div>
                  </div>

                  {/* Klik untuk demo help badge (Mobile Only) */}
                  <div className="md:hidden absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-yellow-300 border-2 border-slate-900 shadow-[2px_2px_0_0_#0f172a] rounded-xl text-black text-[10px] font-black uppercase tracking-widest flex items-center gap-2 animate-bounce">
                    <TiLocationArrow className="w-4 h-4 rotate-45" />
                    <span>Klik untuk demo</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
