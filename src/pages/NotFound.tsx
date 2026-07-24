import { Link } from 'react-router'
import { Compass } from 'lucide-react'
import { Logo } from '@/components/shared/Logo'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <Logo />
      <div className="mt-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
        <Compass className="h-8 w-8 text-muted-foreground" />
      </div>
      <h1 className="mt-6 text-3xl font-bold tracking-tight">Page not found</h1>
      <p className="mt-2 max-w-sm text-muted-foreground">
        That page doesn’t exist — it may have moved, or the link is outdated.
      </p>
      <div className="mt-6 flex gap-2">
        <Button asChild><Link to="/app/dashboard">Go to dashboard</Link></Button>
        <Button asChild variant="outline"><Link to="/">Back to home</Link></Button>
      </div>
    </div>
  )
}
