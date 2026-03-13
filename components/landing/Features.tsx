'use client';

import { VIDEO_LINKS } from "./constants";
import { type PropsWithChildren } from "react";
import { TiLocationArrow } from "react-icons/ti";

function BentoCardWrap({
  children,
  className = "",
}: PropsWithChildren<{ className?: string }>) {
  return <div className={`bento-hover ${className}`}>{children}</div>;
}

interface BentoCardProps {
  src: string;
  title: React.ReactNode;
  description?: string;
}

function BentoCard({ src, title, description }: BentoCardProps) {
  return (
    <article className="relative size-full">
      <video
        src={src}
        loop
        muted
        autoPlay
        playsInline
        className="absolute top-0 left-0 size-full object-cover object-center"
      />
      <div className="relative z-10 flex size-full flex-col justify-between p-5 text-blue-50">
        <div>
          <h2 className="bento-title special-font">{title}</h2>
          {description && (
            <p className="tetx-xl mt-3 max-w-64 md:text-base">{description}</p>
          )}
        </div>
      </div>
    </article>
  );
}

export function Features() {
  return (
    <section className="bg-black pb-52">
      <div className="container mx-auto px-3 md:px-10">
        <div className="px-5 py-32" id="features">
          <p className="font-circular-web text-lg text-blue-50">
            Otomasi Pintar. Zero Coding.
          </p>
          <p className="font-circular-web max-w-md text-lg text-blue-50 opacity-50">
            Workflow otomatis dari pendaftaran, pembayaran, sampai cetak. Panitia
            tinggal duduk manis pantau dashboard.
          </p>
        </div>

        <BentoCardWrap className="border-hsla relative mb-7 h-96 w-full overflow-hidden rounded-md md:h-[65vh]">
          <BentoCard
            src={VIDEO_LINKS.feature1}
            title={
              <>
                Inp<b>u</b>t Data
              </>
            }
            description="Siswa isi form pendaftaran. Webhook otomatis trigger n8n workflow."
          />
        </BentoCardWrap>

        <div
          id="nexus"
          className="grid h-[135vh] grid-cols-2 grid-rows-3 gap-7"
        >
          <BentoCardWrap className="bento-tilt_1 row-span-1 md:col-span-1 md:row-span-2">
            <BentoCard
              src={VIDEO_LINKS.feature2}
              title={
                <>
                  AI Pr<b>o</b>cess
                </>
              }
              description="Sistem AI memproses foto siswa: Auto-enhance dan remove background dalam hitungan detik."
            />
          </BentoCardWrap>

          <BentoCardWrap className="bento-tilt_1 row-span-1 ms-32 md:col-span-1 md:ms-0">
            <BentoCard
              src={VIDEO_LINKS.feature3}
              title={
                <>
                  D<b>a</b>tabase
                </>
              }
              description="Data tersimpan rapi di Airtable secara realtime. Pantau progress kapanpun dimanapun."
            />
          </BentoCardWrap>

          <BentoCardWrap className="bento-tilt_1 me-14 md:col-span-1 md:me-0">
            <BentoCard
              src={VIDEO_LINKS.feature4}
              title={
                <>
                  Inv<b>o</b>ice
                </>
              }
              description="Sistem otomatis mengirimkan tagihan via WhatsApp. Support auto-billing & upsell product."
            />
          </BentoCardWrap>

          <BentoCardWrap className="bento-tilt_2">
            <div className="flex size-full flex-col justify-between bg-violet-300 p-5">
              <h2 className="bento-title special-font max-w-64 text-black">
                M<b>o</b>re co<b>m</b>ing so<b>o</b>n!
              </h2>
              <TiLocationArrow className="m-5 scale-[5] self-end" aria-hidden />
            </div>
          </BentoCardWrap>

          <BentoCardWrap className="bento-tilt_2">
            <video
              src={VIDEO_LINKS.feature5}
              loop
              muted
              autoPlay
              playsInline
              className="size-full object-cover object-center"
            />
          </BentoCardWrap>
        </div>
      </div>
    </section>
  );
}
