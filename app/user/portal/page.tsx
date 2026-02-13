'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import DashboardTitle from '@/components/dashboard/DashboardTitle'
import FeatureCard from '@/components/dashboard/FeatureCard'
import { Sparkles, ImageIcon, Zap, Palette } from 'lucide-react'

export default function UserPortalPage() {
  const [user, setUser] = useState<{ email?: string; id?: string } | null>(null)

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        setUser(session.user)
      }
    }

    fetchUser()
  }, [])

  return (
    <>
      <DashboardTitle
        title="AI Labs Center"
        subtitle="The Infinite Creative Sandbox. Ubah foto yearbook konvensionalmu menjadi karya seni phygital kelas dunia."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <FeatureCard
          href="/"
          title="AI Glow Up"
          description="Enhance foto dengan AI untuk hasil yearbook yang lebih memukau."
          icon={Sparkles}
          badge="FREE"
        />
        <FeatureCard
          href="/"
          title="BG Swap Future"
          description="Ganti background foto dengan tema futuristik dan kreatif."
          icon={ImageIcon}
          badge="FREE"
        />
        <FeatureCard
          href="/user/portal/upload"
          title="Upload & Try On"
          description="Upload foto dan coba virtual try-on untuk yearbook."
          icon={Zap}
          badge="FREE"
        />
        <FeatureCard
          href="/"
          title="Portrait to Art"
          description="Ubah portrait menjadi karya seni digital dengan filter AI."
          icon={Palette}
          badge="PRO"
        />
      </div>
      {user?.email && (
        <p className="mt-8 text-sm text-gray-500">
          Logged in as <span className="text-gray-400">{user.email}</span>
        </p>
      )}
    </>
  )
}
