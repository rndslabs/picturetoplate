import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('')
}

export default function Header() {
  const [initials, setInitials] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const user = data.session?.user
      if (!user) return
      const name = user.user_metadata?.full_name as string | undefined
      setInitials(name ? getInitials(name) : user.email?.[0].toUpperCase() ?? '?')
    })
  }, [])

  return (
    <header className="flex items-center justify-between px-10 py-5 border-b border-hairline-2">
      <div className="flex items-center gap-3">
        <span
          className="inline-flex items-center justify-center font-serif font-medium text-[19px] rounded-full bg-ink text-paper"
          style={{ width: 30, height: 30 }}
        >
          p
        </span>
        <span className="p2p-mono">pic — to — plate</span>
      </div>

      <nav className="flex gap-7 text-sm text-ink-2">
        <span className="text-ink font-medium cursor-pointer">Cook</span>
        <span className="cursor-pointer hover:text-ink transition-colors">Pantry</span>
        <span className="cursor-pointer hover:text-ink transition-colors">Saved</span>
        <span className="cursor-pointer hover:text-ink transition-colors">History</span>
      </nav>

      <div className="flex items-center gap-3">
        <span className="p2p-mono">v0.4 · alpha</span>
        <div
          className="inline-flex items-center justify-center rounded-full bg-sage-soft text-sage-deep text-[13px] font-semibold"
          style={{ width: 32, height: 32 }}
        >
          {initials}
        </div>
      </div>
    </header>
  )
}
