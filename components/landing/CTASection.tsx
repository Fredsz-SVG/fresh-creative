'use client'

import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getRole } from '@/lib/auth'

export default function CTASection() {
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
    <section id="cta" className="landing-cta scroll-mt-16">
      <div className="landing-cta__container">
        <h2 className="landing-cta__title">
          Ready to create your digital yearbook?
        </h2>

        <p className="landing-cta__desc">
          Build stunning AI-powered yearbooks and images in minutes.
          Perfect for schools, communities, creators, and teams —
          no design or technical skills required.
        </p>

        <div className="landing-cta__actions">
          <button
            onClick={handleGetStarted}
            className="landing-cta__btn landing-cta__btn--primary"
          >
            Get Started Free
          </button>

          <button
            onClick={() => router.push('#about')}
            className="landing-cta__btn landing-cta__btn--secondary"
          >
            Learn More
          </button>
        </div>
      </div>
    </section>
  )
}
