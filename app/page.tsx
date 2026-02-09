import Navbar from '@/components/landing/Navbar'
import HeroSection from '@/components/landing/HeroSection'
import FeatureSection from '@/components/landing/FeatureSection'
import AboutSection from '@/components/landing/AboutSection'
import CTASection from '@/components/landing/CTASection'

export default function LandingPage() {
  return (
    <>
      <Navbar />

      <main className="pt-16 landing-bg">
        <HeroSection />
        <FeatureSection />
        <AboutSection />
        <CTASection />
      </main>
    </>
  )
}
