'use client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MotionConfig } from 'framer-motion'
import { useState } from 'react'
import { Toaster } from '@/components/ui/sonner'
import { useTheme } from '@/hooks/useTheme'

function ThemeEffect() {
  // Applies the user's stored theme preference (light/dark/system) to <html>.
  useTheme()
  return null
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient())
  return (
    <QueryClientProvider client={client}>
      <ThemeEffect />
      {/* reducedMotion="user" makes every framer-motion animation in the app
          honor prefers-reduced-motion automatically (transforms/opacity still
          apply, just instantly) — the CSS media query in globals.css only
          covers plain CSS transitions/keyframes, not JS-driven motion. */}
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  )
}
