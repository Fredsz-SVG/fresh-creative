'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent('/reset-password')}`,
    })

    if (error) setError(error.message)
    else setMessage('Reset password link has been sent to your email.')

    setLoading(false)
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">Forgot Password</h1>

        <form onSubmit={handleReset} className="auth-form">
          <div className="auth-field">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
            />
          </div>

          {error && <p className="auth-error">{error}</p>}
          {message && <p className="auth-success">{message}</p>}

          <button disabled={loading} className="auth-button">
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>

        <p className="auth-footer">
          <Link href="/login">Back to login</Link>
        </p>
      </div>
    </div>
  )
}
