'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { fetchWithAuth } from '../../../lib/api-client'
import { asObject } from '@/components/yearbook/utils/response-narrowing'

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
      const res = await fetchWithAuth('/api/albums')
      if (!res.ok) throw new Error('Failed to fetch data')
      const allAlbums = await res.json()
      // We filter for 'yearbook' type on the client-side
      const list = Array.isArray(allAlbums) ? allAlbums : []
      const yearbookOrders = list.filter((album: any) => asObject(album).type === 'yearbook')
      setOrders(yearbookOrders)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchYearbookOrders()
  }, [])

  const handleUpdateStatus = async (e: React.MouseEvent, order: YearbookOrder, status: 'approved' | 'declined') => {
    e.stopPropagation() // Prevent row click
    try {
      const res = await fetchWithAuth('/api/albums', {
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
      const res = await fetchWithAuth('/api/albums', {
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
    <div className="p-4 sm:p-6 w-full">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-app">Yearbook Order Management</h1>
      </div>

      {loading ? (
          <div className="neo-card p-6 animate-pulse">
          <div className="h-10 bg-slate-50 dark:bg-slate-800 border-b-2 border-slate-900 dark:border-slate-700 w-full mb-4" />
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center py-4 border-b-2 border-slate-900/10 dark:border-slate-700/50 gap-4 last:border-b-0">
              <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-1/4" />
              <div className="h-4 bg-slate-50 dark:bg-slate-800 rounded w-1/6 hidden sm:block" />
              <div className="h-4 bg-slate-50 dark:bg-slate-800 rounded w-1/6" />
              <div className="h-8 w-20 bg-slate-100 dark:bg-slate-800 rounded-xl border-2 border-slate-900 border-dashed ml-auto" />
            </div>
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16 neo-card border-dashed">
          <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">No Yearbook Orders Found</h3>
          <p className="text-slate-500 dark:text-slate-400 font-bold mt-2">When a user submits a new yearbook order, it will appear here.</p>
        </div>
      ) : (
        <div className="neo-card">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-800/50 border-b-2 border-slate-900 dark:border-slate-700">
                <tr>
                  <th scope="col" className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest w-1/3">School / Name</th>
                  <th scope="col" className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest hidden sm:table-cell">City</th>
                  <th scope="col" className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest hidden md:table-cell whitespace-nowrap">PIC</th>
                  <th scope="col" className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest whitespace-nowrap">Package</th>
                  <th scope="col" className="px-6 py-4 text-center text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Status</th>
                  <th scope="col" className="px-6 py-4 text-right text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-slate-900/5 dark:divide-slate-700/30">
                {orders.map((order) => (
                  <tr
                    key={order.id}
                    onClick={() => handleRowClick(order.id)}
                    className="group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4 text-sm font-bold text-slate-900 dark:text-white">
                      <div className="flex flex-col">
                        <span className="break-words line-clamp-2">{order.name}</span>
                        <span className="text-[10px] font-bold text-slate-400 sm:hidden mt-0.5">
                          {[order.school_city, order.pic_name].filter(Boolean).join(' • ')}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 hidden sm:table-cell whitespace-nowrap">{order.school_city || '-'}</td>
                    <td className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 hidden md:table-cell whitespace-nowrap">{order.pic_name || '-'}</td>
                    <td className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-900 dark:border-slate-700 rounded-lg">{order.pricing_packages?.name || 'Yearbook'}</span>
                    </td>
                    <td className="px-6 py-4 text-center whitespace-nowrap">
                      <span className={`inline-block px-3 py-1 text-[10px] font-black uppercase tracking-tight rounded-xl border-2 ${order.status === 'approved' ? 'bg-emerald-400 text-slate-900 border-slate-900 shadow-[2px_2px_0_0_#059669]' :
                          order.status === 'pending' ? 'bg-amber-400 text-slate-900 border-slate-900 shadow-[2px_2px_0_0_#d97706]' :
                            'bg-rose-500 text-white border-slate-900 shadow-[2px_2px_0_0_#9f1239]'
                        }`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <div className="flex gap-2 justify-end items-center">
                        {(order.status === 'pending') && (
                          <>
                            <button 
                              onClick={(e) => handleUpdateStatus(e, order, 'approved')} 
                              className="px-3 py-1.5 rounded-xl bg-emerald-400 border-2 border-slate-900 text-slate-900 text-[10px] font-black uppercase tracking-widest shadow-[2px_2px_0_0_#000] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
                            >
                              Approve
                            </button>
                            <button 
                              onClick={(e) => handleUpdateStatus(e, order, 'declined')} 
                              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border-2 border-slate-900 text-slate-900 dark:text-white text-[10px] font-black uppercase tracking-widest shadow-[2px_2px_0_0_#000] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        <button 
                          onClick={(e) => handleDelete(e, order.id)} 
                          className="p-2 rounded-xl bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 border-2 border-slate-900 shadow-[2px_2px_0_0_#000] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
                        >
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
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
