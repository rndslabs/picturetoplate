import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function AuthCallback() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Supabase JS v2 automatically exchanges the PKCE code in the URL on init.
    // Listening to onAuthStateChange catches the SIGNED_IN event once it resolves.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        navigate('/signin', { replace: true })
      }
    })

    // Fallback: if already signed in (e.g. page refresh), redirect immediately
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) { setError(error.message); return }
      if (data.session) navigate('/signin', { replace: true })
    })

    return () => subscription.unsubscribe()
  }, [navigate])

  if (error) {
    return (
      <div
        className="flex flex-col items-center justify-center"
        style={{ height: '100vh', background: 'var(--paper)', color: 'var(--ink)', gap: 16 }}
      >
        <p className="p2p-mono" style={{ color: 'var(--tomato)' }}>verification failed</p>
        <p style={{ fontFamily: 'var(--sans)', fontSize: 14, color: 'var(--ink-2)' }}>{error}</p>
        <a href="/signin" style={{ fontFamily: 'var(--sans)', color: 'var(--sage)' }}>Back to sign in</a>
      </div>
    )
  }

  return (
    <div
      className="flex flex-col items-center justify-center"
      style={{ height: '100vh', background: 'var(--paper)', color: 'var(--ink)', gap: 12 }}
    >
      <span className="p2p-mono">verifying email…</span>
    </div>
  )
}
