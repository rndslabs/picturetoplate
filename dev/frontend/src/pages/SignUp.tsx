import { useState } from 'react'
import { Link } from 'react-router-dom'
import AuthBrandPanel from '../components/layout/AuthBrandPanel'
import { supabase } from '../lib/supabase'

export default function SignUp() {
  const [name,     setName]     = useState('')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [error,    setError]    = useState<string | null>(null)
  const [loading,  setLoading]  = useState(false)
  const [sent,     setSent]     = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password !== confirm) { setError('Passwords don\'t match.'); return }
    if (password.length < 8)  { setError('Password must be at least 8 characters.'); return }

    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    setLoading(false)

    if (error) { setError(error.message); return }
    setSent(true)
  }

  if (sent) {
    return (
      <div className="flex overflow-hidden" style={{ height: '100vh' }}>
        <AuthBrandPanel />
        <div
          className="flex flex-1 items-center justify-center"
          style={{ background: 'var(--paper)', padding: '48px 56px' }}
        >
          <div style={{ width: '100%', maxWidth: 400 }}>
            <div className="p2p-mono" style={{ marginBottom: 12 }}>
              <span className="p2p-dot" style={{ marginRight: 8 }} />
              check your inbox
            </div>
            <h2
              className="font-serif font-normal m-0"
              style={{ fontSize: 44, lineHeight: 1.05, letterSpacing: '-0.025em', fontVariationSettings: '"SOFT" 100' }}
            >
              Almost there.
            </h2>
            <p
              className="font-serif italic font-light"
              style={{ fontSize: 16, color: 'var(--ink-2)', margin: '8px 0 0', lineHeight: 1.45 }}
            >
              We sent a verification link to <strong style={{ fontStyle: 'normal', color: 'var(--ink)' }}>{email}</strong>.
              Click it to activate your account.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex overflow-hidden" style={{ height: '100vh' }}>
      <AuthBrandPanel />

      {/* Right — form panel */}
      <div
        className="flex flex-1 items-center justify-center overflow-auto"
        style={{ background: 'var(--paper)', padding: '48px 56px' }}
      >
        <div style={{ width: '100%', maxWidth: 400, paddingBlock: 24 }}>
          {/* Eyebrow */}
          <div className="p2p-mono" style={{ marginBottom: 12 }}>
            <span className="p2p-dot" style={{ marginRight: 8 }} />
            create account
          </div>

          <h2
            className="font-serif font-normal m-0"
            style={{
              fontSize: 44, lineHeight: 1.05,
              letterSpacing: '-0.025em',
              fontVariationSettings: '"SOFT" 100',
            }}
          >
            Join the kitchen.
          </h2>
          <p
            className="font-serif italic font-light"
            style={{
              fontSize: 16, color: 'var(--ink-2)',
              margin: '8px 0 40px', lineHeight: 1.45,
            }}
          >
            Cook smarter. Waste less. Eat well.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col" style={{ gap: 26 }}>
            {/* Full name */}
            <div>
              <label className="p2p-mono" style={{ display: 'block', marginBottom: 8, color: 'var(--ink-3)' }}>
                full name
              </label>
              <input
                type="text"
                name="name"
                autoComplete="name"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Margot Klein"
                required
                className="p2p-field"
              />
            </div>

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
              <label className="p2p-mono" style={{ display: 'block', marginBottom: 8, color: 'var(--ink-3)' }}>
                password
              </label>
              <input
                type="password"
                name="new-password"
                autoComplete="new-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="8+ characters"
                required
                className="p2p-field"
                style={{ fontFamily: 'var(--sans)', letterSpacing: '0.15em' }}
              />
            </div>

            {/* Confirm password */}
            <div>
              <label className="p2p-mono" style={{ display: 'block', marginBottom: 8, color: 'var(--ink-3)' }}>
                confirm password
              </label>
              <input
                type="password"
                name="confirm-password"
                autoComplete="new-password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="••••••••"
                required
                className="p2p-field"
                style={{ fontFamily: 'var(--sans)', letterSpacing: '0.15em' }}
              />
            </div>

            {/* Error */}
            {error && (
              <p className="p2p-mono" style={{ color: 'var(--tomato)', margin: 0, fontSize: 11 }}>
                {error}
              </p>
            )}

            {/* Disclaimer */}
            <p style={{ fontFamily: 'var(--sans)', fontSize: 12, color: 'var(--ink-3)', margin: 0, lineHeight: 1.5 }}>
              By creating an account you agree to our{' '}
              <span style={{ color: 'var(--ink-2)', borderBottom: '1px solid var(--hairline)', cursor: 'pointer' }}>Terms</span>
              {' '}and{' '}
              <span style={{ color: 'var(--ink-2)', borderBottom: '1px solid var(--hairline)', cursor: 'pointer' }}>Privacy Policy</span>.
            </p>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="p2p-btn p2p-btn-primary"
              style={{ width: '100%', opacity: loading ? 0.65 : 1 }}
            >
              {loading ? 'Creating account…' : 'Create account →'}
            </button>
          </form>

          {/* Sign-in link */}
          <p style={{ textAlign: 'center', fontFamily: 'var(--sans)', fontSize: 14, color: 'var(--ink-2)', margin: '28px 0 0' }}>
            Already a member?{' '}
            <Link
              to="/signin"
              style={{ color: 'var(--ink)', fontWeight: 500, textDecoration: 'none', borderBottom: '1px solid var(--ink)', paddingBottom: 1 }}
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
