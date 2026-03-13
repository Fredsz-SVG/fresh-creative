'use client';

import { Navbar } from "./Navbar";
import { Hero } from "./Hero";
import { About } from "./About";
import { Features } from "./Features";
import { Pricing } from "./Pricing";
import { FAQ } from "./FAQ";
import { DemoLivePhoto } from "./DemoLivePhoto";
import { Contact } from "./Contact";
import { Footer } from "./Footer";

export default function LandingPage() {
  return (
    <main className="relative min-h-screen w-full overflow-x-hidden">
      <Navbar />
      <Hero />
      <About />
      <Features />
      <Pricing />
      <DemoLivePhoto />
      <FAQ />
      <Contact />
      <Footer />
    </main>
  );
}
