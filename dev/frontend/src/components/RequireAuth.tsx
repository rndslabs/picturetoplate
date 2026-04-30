import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<'loading' | 'ok' | 'none'>('loading')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setStatus(data.session ? 'ok' : 'none')
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setStatus(session ? 'ok' : 'none')
    })

    return () => subscription.unsubscribe()
  }, [])

  if (status === 'loading') return null
  if (status === 'none') return <Navigate to="/signin" replace />
  return <>{children}</>
}
