'use client'
import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

// F15: app-wide keyboard shortcuts beyond Cmd/Ctrl+K search. Gmail-style
// two-key nav ("g" then a letter) keeps single letters free for the browser/
// OS and avoids accidental triggers while typing — "n" alone is safe for
// quick-add since no text field is focused when it's meant to fire.
const NAV_SHORTCUTS: Record<string, string> = {
  d: '/app/dashboard',
  t: '/app/transactions',
  b: '/app/budgets',
  a: '/app/accounts',
  g: '/app/goals',
  r: '/app/reports',
  s: '/app/settings/profile',
}

const GO_TIMEOUT_MS = 900

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false
  const tag = el.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable
}

interface Options {
  onOpenHelp: () => void
}

export function useGlobalShortcuts({ onOpenHelp }: Options) {
  const router = useRouter()
  const pendingGo = useRef(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (isTypingTarget(e.target)) return

      if (pendingGo.current) {
        pendingGo.current = false
        if (timeoutRef.current) clearTimeout(timeoutRef.current)
        const to = NAV_SHORTCUTS[e.key.toLowerCase()]
        if (to) {
          e.preventDefault()
          router.push(to)
        }
        return
      }

      if (e.key === 'g') {
        pendingGo.current = true
        timeoutRef.current = setTimeout(() => { pendingGo.current = false }, GO_TIMEOUT_MS)
        return
      }
      if (e.key === 'n') {
        e.preventDefault()
        router.push('/app/transactions?add=1')
        return
      }
      if (e.key === '?') {
        e.preventDefault()
        onOpenHelp()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [router, onOpenHelp])
}

export const SHORTCUTS_HELP: { keys: string; label: string }[] = [
  { keys: '⌘ K', label: 'Open search' },
  { keys: 'N', label: 'Add transaction' },
  { keys: 'G then D', label: 'Go to dashboard' },
  { keys: 'G then T', label: 'Go to transactions' },
  { keys: 'G then B', label: 'Go to budgets' },
  { keys: 'G then A', label: 'Go to accounts' },
  { keys: 'G then G', label: 'Go to goals' },
  { keys: 'G then R', label: 'Go to reports' },
  { keys: 'G then S', label: 'Go to settings' },
  { keys: '?', label: 'Show this help' },
]
