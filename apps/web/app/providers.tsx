'use client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
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
      {children}
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  )
}
