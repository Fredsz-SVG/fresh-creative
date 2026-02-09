'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

// Interface for Yearbook orders in the admin management context
interface YearbookOrder {
  id: string
  name: string
  status: 'pending' | 'approved' | 'declined'
  school_city?: string
  kab_kota?: string
  pic_name?: string
  students_count?: number
  pricing_packages: {
    name: string
  } | null
}

export default function YearbookManagementPage() {
  const [orders, setOrders] = useState<YearbookOrder[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // Function to fetch only yearbook orders
  const fetchYearbookOrders = async () => {
    // Keep loading true only on first load if needed, or handle it gracefully
    // setLoading(true) 
    try {
      const res = await fetch('/api/albums', { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to fetch data')
      const allAlbums = await res.json()
      // We filter for 'yearbook' type on the client-side
      const yearbookOrders = allAlbums.filter((album: any) => album.type === 'yearbook')
      setOrders(yearbookOrders)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchYearbookOrders()

    // Subscribe to realtime changes on 'albums' table
    const channel = supabase
      .channel('admin-yearbook-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'albums' }, () => {
        fetchYearbookOrders()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const handleUpdateStatus = async (e: React.MouseEvent, order: YearbookOrder, status: 'approved' | 'declined') => {
    e.stopPropagation() // Prevent row click
    try {
      const res = await fetch('/api/albums', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: order.id, status }),
      })
      if (res.ok) {
        fetchYearbookOrders()
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation() // Prevent row click
    if (!confirm('Are you sure you want to permanently delete this yearbook order?')) return
    try {
      const res = await fetch('/api/albums', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (res.ok) {
        setOrders(orders.filter(order => order.id !== id))
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleRowClick = (id: string) => {
    // Navigate to album details
    router.push(`/admin/album/yearbook/${id}`)
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-app">Yearbook Order Management</h1>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-20">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-lime-500 border-t-transparent" />
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-white/10 rounded-lg">
          <h3 className="text-lg font-semibold text-app">No Yearbook Orders Found</h3>
          <p className="text-muted mt-2">When a user submits a new yearbook order, it will appear here.</p>
        </div>
      ) : (
        <div className="bg-white/[0.02] border border-white/10 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-white/[0.03]">
                <tr>
                  <th scope="col" className="px-4 py-3 text-xs font-medium text-muted uppercase tracking-wider w-1/3">School / Name</th>
                  <th scope="col" className="px-4 py-3 text-xs font-medium text-muted uppercase tracking-wider hidden sm:table-cell">City</th>
                  <th scope="col" className="px-4 py-3 text-xs font-medium text-muted uppercase tracking-wider hidden md:table-cell">PIC</th>
                  <th scope="col" className="px-4 py-3 text-xs font-medium text-muted uppercase tracking-wider">Package</th>
                  <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-muted uppercase tracking-wider">Status</th>
                  <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-muted uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {orders.map((order) => (
                  <tr
                    key={order.id}
                    onClick={() => handleRowClick(order.id)}
                    className="group hover:bg-white/[0.04] transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3 text-sm font-medium text-app">
                      <div className="flex flex-col">
                        <span className="break-words line-clamp-2">{order.name}</span>
                        <span className="text-xs text-muted sm:hidden mt-1">
                          {[order.school_city, order.pic_name].filter(Boolean).join(' • ')}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted hidden sm:table-cell whitespace-nowrap">{order.school_city || '-'}</td>
                    <td className="px-4 py-3 text-sm text-muted hidden md:table-cell whitespace-nowrap">{order.pic_name || '-'}</td>
                    <td className="px-4 py-3 text-sm text-muted whitespace-nowrap">{order.pricing_packages?.name}</td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <span className={`inline-block px-2 py-0.5 text-[10px] sm:text-xs font-semibold rounded-full ${order.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                          order.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-red-500/20 text-red-400'
                        }`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="flex gap-2 justify-end items-center">
                        {(order.status === 'pending') && (
                          <>
                            <button onClick={(e) => handleUpdateStatus(e, order, 'approved')} className="p-1.5 text-green-500 hover:text-green-400 bg-green-500/10 hover:bg-green-500/20 rounded transition-colors" title="Approve">
                              <span className="text-xs font-medium">Approve</span>
                            </button>
                            <button onClick={(e) => handleUpdateStatus(e, order, 'declined')} className="p-1.5 text-yellow-500 hover:text-yellow-400 bg-yellow-500/10 hover:bg-yellow-500/20 rounded transition-colors" title="Decline">
                              <span className="text-xs font-medium">Decline</span>
                            </button>
                          </>
                        )}
                        <button onClick={(e) => handleDelete(e, order.id)} className="p-1.5 text-red-500 hover:text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded transition-colors" title="Delete">
                          <span className="text-xs font-medium">Del</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
