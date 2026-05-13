'use client'

import { createContext, useContext } from 'react'

export type TopUpCreditsContextValue = {
  openTopUp: () => void
  credits: number
}

export const TopUpCreditsContext = createContext<TopUpCreditsContextValue | null>(null)

export function useTopUpCredits(): TopUpCreditsContextValue {
  const ctx = useContext(TopUpCreditsContext)
  if (!ctx) {
    throw new Error('useTopUpCredits must be used within DashboardShell')
  }
  return ctx
}
