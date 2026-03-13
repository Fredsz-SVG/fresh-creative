'use client';

import { Navbar } from "./Navbar";
import { Hero } from "./Hero";
import { About } from "./About";
import { Features } from "./Features";
import { Pricing } from "./Pricing";
import { Story } from "./Story";
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
      <Story />
      <Contact />
      <Footer />
    </main>
  );
}
