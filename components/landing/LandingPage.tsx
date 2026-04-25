'use client';

import { Navbar } from "./Navbar";
import { Hero } from "./Hero";
import { About as AboutSection } from "./About";
import { Portfolio } from "./Portfolio";
import { Features } from "./Features";
import { Pricing } from "./Pricing";
import { FAQ } from "./FAQ";

import { DemoEbook } from "./DemoEbook";
import { Contact } from "./Contact";
import { Footer } from "./Footer";
import { ScrollToTop } from "./ScrollToTop";

export default function LandingPage() {
  return (
    <main className="relative min-h-screen w-full overflow-x-hidden bg-slate-100 dark:bg-slate-950 transition-colors duration-500">
      <Navbar />
      <Hero />
      <Portfolio />
      <AboutSection />
      <Features />
      <Pricing />
      <DemoEbook />

      <FAQ />
      <Contact />
      <Footer />
      <ScrollToTop />
    </main>
  );
}
