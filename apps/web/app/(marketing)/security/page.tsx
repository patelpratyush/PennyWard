'use client'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Download, Eye, KeyRound, Lock, ServerCog, ShieldCheck, Trash2, UserCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

const items = [
  { icon: Lock, title: 'Encryption in transit', text: 'All production traffic is encrypted with TLS 1.2+. Sensitive fields are encrypted at rest in PostgreSQL.' },
  { icon: Eye, title: 'Read-only bank connections', text: 'Bank connections (via Plaid, on the roadmap) are strictly read-only. FinPilot can never initiate transfers or payments.' },
  { icon: ShieldCheck, title: 'No data selling, ever', text: 'We do not sell, rent, or share personal financial data with advertisers. Revenue comes from subscriptions.' },
  { icon: KeyRound, title: 'Modern authentication', text: 'Passwords are hashed with modern algorithms. Two-factor authentication and passkeys are on the roadmap.' },
  { icon: UserCheck, title: 'Session controls', text: 'View active sessions, sign out other devices, and revoke access from Settings → Security.' },
  { icon: Download, title: 'Your data is portable', text: 'Export everything — transactions, budgets, plans — as CSV or JSON at any time. No lock-in.' },
  { icon: Trash2, title: 'Real deletion', text: 'Deleting your account removes your data from our systems. Exports are available before you go.' },
  { icon: ServerCog, title: 'Responsible infrastructure', text: 'Least-privilege access, audited dependencies, and a responsible-disclosure policy for researchers.' },
]

export default function Security() {
  return (
    <div className="px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-2xl text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Security at FinPilot</h1>
          <p className="mt-3 text-muted-foreground">
            Financial data deserves restraint. FinPilot is built to know as little about you as possible — and to protect what it does know.
          </p>
        </motion.div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2">
          {items.map((it, i) => (
            <motion.div key={it.title} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: (i % 2) * 0.06 }}>
              <Card className="h-full shadow-card">
                <CardContent className="flex gap-4 p-5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                    <it.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-semibold">{it.title}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{it.text}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <Card className="mt-10 shadow-card">
          <CardContent className="p-6 text-sm text-muted-foreground">
            <h2 className="mb-2 text-base font-semibold text-foreground">About this demo</h2>
            <p>
              The version you are exploring stores all data locally in your browser — nothing leaves your device.
              The security practices above describe the production architecture FinPilot is designed for, including the
              planned FastAPI + PostgreSQL backend and read-only Plaid connections.
            </p>
            <p className="mt-3">
              Found a vulnerability? Email <span className="font-medium text-foreground">security@finpilot.example</span> — we follow coordinated disclosure.
            </p>
            <Button asChild variant="outline" className="mt-4">
              <Link href="/privacy">Read the privacy policy</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
