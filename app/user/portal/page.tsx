'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import DashboardTitle from '@/components/dashboard/DashboardTitle'
import FeatureCard from '@/components/dashboard/FeatureCard'
import { Sparkles, ImageIcon, Zap, Palette, Clock, CheckCircle } from 'lucide-react'
import { Card } from '@/components/ui/Card'

interface JoinRequest {
  id: string
  album_id: string
  student_name: string
  class_name: string | null
  email: string
  status: 'pending' | 'approved' | 'rejected'
  requested_at: string
  album_name?: string
}

export default function UserPortalPage() {
  const [user, setUser] = useState<{ email?: string; id?: string } | null>(null)
  const [pendingRequests, setPendingRequests] = useState<JoinRequest[]>([])
  const [loadingRequests, setLoadingRequests] = useState(true)

  useEffect(() => {
    const fetchUserAndRequests = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        setUser(session.user)
        
        // Fetch join requests from API endpoint (uses admin client to bypass RLS)
        try {
          const response = await fetch('/api/user/join-requests', {
            cache: 'no-store'
          })
          
          if (response.ok) {
            const requests = await response.json()
            setPendingRequests(requests)
          } else {
            console.error('Failed to fetch join requests')
          }
        } catch (error) {
          console.error('Error fetching join requests:', error)
        }
        
        setLoadingRequests(false)
      }
    }

    fetchUserAndRequests()
  }, [])

  return (
    <>
      <DashboardTitle
        title="AI Labs Center"
        subtitle="The Infinite Creative Sandbox. Ubah foto yearbook konvensionalmu menjadi karya seni phygital kelas dunia."
      />
      
      {/* Pending/Approved Join Requests */}
      {!loadingRequests && pendingRequests.length > 0 && (
        <div className="mb-6 space-y-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Status Pendaftaran Album
          </h2>
          {pendingRequests.map((request) => (
            <Card key={request.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {request.status === 'pending' ? (
                      <Clock className="w-4 h-4 text-yellow-500" />
                    ) : (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    )}
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                      {request.album_name}
                    </h3>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {request.student_name}
                    {request.class_name && ` - ${request.class_name}`}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    {request.email}
                  </p>
                </div>
                <div className="text-right">
                  {request.status === 'pending' ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                      Menunggu Persetujuan
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                      Disetujui
                    </span>
                  )}
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    {new Date(request.requested_at).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
      
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
