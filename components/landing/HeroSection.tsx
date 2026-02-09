'use client'

import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getRole } from '@/lib/auth'

export default function HeroSection() {
  const router = useRouter()

  const handleGetStarted = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      const role = await getRole(supabase, session.user)
      router.push(role === 'admin' ? '/admin' : '/user')
    } else {
      router.push('/login')
    }
  }

  return (
    <section id="hero" className="landing-hero scroll-mt-16">
      <div className="landing-hero__container">
        <h1 className="landing-hero__title">
          Create Your Digital Yearbook
        </h1>

        <p className="landing-hero__desc">
          Build a modern online yearbook for schools, communities, and teams.
          Collect profiles, photos, and memories — all in one place.
        </p>

        <div className="landing-hero__actions">
          <button
            onClick={handleGetStarted}
            className="landing-hero__btn landing-hero__btn--primary"
          >
            Get Started Free
          </button>

          <button
            onClick={() => router.push('#features')}
            className="landing-hero__btn landing-hero__btn--secondary"
          >
            See Features
          </button>
        </div>
      </div>
    </section>
  )
}
