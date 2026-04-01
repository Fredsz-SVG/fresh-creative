"use client"

import { type ReactNode, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

type RealtimeEvent = {
  type?: string
  channel?: string
  payload?: Record<string, unknown>
  ts?: string
}

function getRealtimeWsUrl(): string {
  const explicitApi = process.env.NEXT_PUBLIC_API_URL?.trim()
  if (explicitApi) {
    const api = new URL(explicitApi)
    const protocol = api.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${protocol}//${api.host}/api/realtime/ws`
  }
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${window.location.host}/api/realtime/ws`
}

export default function RealtimeProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const reconnectAttemptRef = useRef(0)
  const lastRefreshAtRef = useRef(0)
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let socket: WebSocket | null = null
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null
    let closedByEffect = false

    const refreshSoon = () => {
      const now = Date.now()
      const elapsed = now - lastRefreshAtRef.current
      if (elapsed >= 750) {
        lastRefreshAtRef.current = now
        router.refresh()
        return
      }
      if (!refreshTimeoutRef.current) {
        refreshTimeoutRef.current = setTimeout(() => {
          refreshTimeoutRef.current = null
          lastRefreshAtRef.current = Date.now()
          router.refresh()
        }, 800 - elapsed)
      }
    }

    const connect = () => {
      socket = new WebSocket(getRealtimeWsUrl())

      socket.onopen = () => {
        reconnectAttemptRef.current = 0
      }

      socket.onmessage = (event) => {
        let parsed: RealtimeEvent | null = null
        try {
          parsed = JSON.parse(event.data) as RealtimeEvent
        } catch {
          return
        }

        if (!parsed?.type) {
          return
        }

        window.dispatchEvent(new CustomEvent('fresh:realtime', { detail: parsed }))
        refreshSoon()
      }

      socket.onclose = () => {
        if (closedByEffect) return
        const attempt = reconnectAttemptRef.current + 1
        reconnectAttemptRef.current = attempt
        const delay = Math.min(15000, 500 * Math.pow(2, Math.min(attempt, 5)))
        reconnectTimeout = setTimeout(connect, delay)
      }

      socket.onerror = () => {
        socket?.close()
      }
    }

    connect()

    return () => {
      closedByEffect = true
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current)
        refreshTimeoutRef.current = null
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout)
      }
      socket?.close()
    }
  }, [router])

  return <>{children}</>
}
