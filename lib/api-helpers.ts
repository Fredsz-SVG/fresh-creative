import { NextResponse } from 'next/server'

/**
 * Helper: JSON error response
 */
export function jsonError(message: string, status = 400, extra?: Record<string, any>) {
  return NextResponse.json({ ok: false, error: message, ...extra }, { status })
}

/**
 * Helper: JSON success response
 */
export function jsonOk(data: any = { ok: true }) {
  return NextResponse.json(data)
}
