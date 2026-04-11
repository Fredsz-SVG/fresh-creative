"use client"

import { type ReactNode, useEffect, useRef } from 'react'
import { apiUrl } from '@/lib/api-url'

type RealtimeEvent = {
  type?: string
  channel?: string
  payload?: Record<string, unknown>
  ts?: string
}

function getRealtimeWsUrl(): string {
  // Keep base origin consistent with fetchWithAuth/apiUrl().
  const httpUrl = apiUrl('/api/realtime/ws')
  if (httpUrl.startsWith('https://')) return httpUrl.replace(/^https:\/\//, 'wss://')
  if (httpUrl.startsWith('http://')) return httpUrl.replace(/^http:\/\//, 'ws://')
  // Relative fallback (same-origin).
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${window.location.host}/api/realtime/ws`
}

export default function RealtimeProvider({ children }: { children: ReactNode }) {
  const reconnectAttemptRef = useRef(0)

  useEffect(() => {
    let socket: WebSocket | null = null
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null
    let closedByEffect = false

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
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout)
      }
      socket?.close()
    }
  }, [])

  return <>{children}</>
}
