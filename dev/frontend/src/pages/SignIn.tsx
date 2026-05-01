import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthBrandPanel from '../components/layout/AuthBrandPanel'
import { supabase } from '../lib/supabase'

export default function SignIn() {
  const navigate = useNavigate()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState<string | null>(null)
  const [loading,  setLoading]  = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }
    navigate('/app', { replace: true })
  }

  return (
    <div className="flex overflow-hidden" style={{ height: '100vh' }}>
      <AuthBrandPanel />

      {/* Right — form panel */}
      <div
        className="flex flex-1 items-center justify-center"
        style={{ background: 'var(--paper)', padding: '48px 56px' }}
      >
        <div style={{ width: '100%', maxWidth: 400 }}>
          {/* Eyebrow */}
          <div className="p2p-mono" style={{ marginBottom: 12 }}>
            <span className="p2p-dot" style={{ marginRight: 8 }} />
            sign in
          </div>

          <h2
            className="font-serif font-normal m-0"
            style={{
              fontSize: 44, lineHeight: 1.05,
              letterSpacing: '-0.025em',
              fontVariationSettings: '"SOFT" 100',
            }}
          >
            Welcome back.
          </h2>
          <p
            className="font-serif italic font-light"
            style={{
              fontSize: 16, color: 'var(--ink-2)',
              margin: '8px 0 40px', lineHeight: 1.45,
            }}
          >
            Your pantry's been waiting.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col" style={{ gap: 28 }}>
            {/* Email */}
            <div>
              <label className="p2p-mono" style={{ display: 'block', marginBottom: 8, color: 'var(--ink-3)' }}>
                email
              </label>
              <input
                type="email"
                name="email"
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="p2p-field"
              />
            </div>

            {/* Password */}
            <div>
              <div className="flex items-baseline justify-between" style={{ marginBottom: 8 }}>
                <label className="p2p-mono" style={{ color: 'var(--ink-3)' }}>password</label>
                <span
                  className="p2p-mono cursor-pointer"
                  style={{ color: 'var(--ink-3)', fontSize: 10 }}
                  onClick={() => alert('Password reset coming soon.')}
                >
                  Forgot?
                </span>
              </div>
              <input
                type="password"
                name="password"
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="p2p-field"
                style={{ fontFamily: 'var(--sans)', letterSpacing: '0.15em' }}
              />
            </div>

            {/* Error */}
            {error && (
              <p
                className="p2p-mono"
                style={{ color: 'var(--tomato)', margin: 0, fontSize: 11 }}
              >
                {error}
              </p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="p2p-btn p2p-btn-primary"
              style={{ width: '100%', marginTop: 4, opacity: loading ? 0.65 : 1 }}
            >
              {loading ? 'Signing in…' : 'Sign in →'}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center" style={{ gap: 16, margin: '32px 0' }}>
            <div style={{ flex: 1, height: 1, background: 'var(--hairline-2)' }} />
            <span className="p2p-mono" style={{ color: 'var(--ink-3)' }}>or</span>
            <div style={{ flex: 1, height: 1, background: 'var(--hairline-2)' }} />
          </div>

          {/* Sign-up link */}
          <p
            style={{
              textAlign: 'center',
              fontFamily: 'var(--sans)', fontSize: 14,
              color: 'var(--ink-2)', margin: 0,
            }}
          >
            No account yet?{' '}
            <Link
              to="/signup"
              style={{
                color: 'var(--ink)', fontWeight: 500,
                textDecoration: 'none',
                borderBottom: '1px solid var(--ink)',
                paddingBottom: 1,
              }}
            >
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
