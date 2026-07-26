'use client'
import { motion } from 'framer-motion'
import { Compass, HeartHandshake, LineChart } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

export default function About() {
  return (
    <div className="px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">About FinPilot</h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Most people don’t need more financial noise. They need a clear answer to simple questions:
            where did the money go, and what should happen next?
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="mt-10 space-y-6 text-muted-foreground">
          <p>
            FinPilot started with a spreadsheet — the kind people build when a car loan, a student loan, and a credit
            card all compete for the same paycheck. The spreadsheet worked, but it was fragile and joyless.
            FinPilot is that spreadsheet, rebuilt as a calm, trustworthy product.
          </p>
          <p>
            We focus on the unglamorous math that actually changes outcomes: the true cost of financing a vehicle,
            the month a debt finally hits zero, the difference an extra $100 makes. No trading games, no hype —
            just clear numbers and plans you can follow.
          </p>
        </motion.div>

        <div className="mt-12 grid gap-4 sm:grid-cols-3">
          {[
            { icon: Compass, title: 'Clarity first', text: 'Every screen answers a real question in plain language.' },
            { icon: LineChart, title: 'Honest math', text: 'Standard amortization, transparent assumptions, no hidden optimism.' },
            { icon: HeartHandshake, title: 'On your side', text: 'Subscriptions, not data sales. Export and delete anytime.' },
          ].map((v, i) => (
            <motion.div key={v.title} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }}>
              <Card className="h-full shadow-card">
                <CardContent className="p-5">
                  <v.icon className="h-5 w-5 text-primary" />
                  <h2 className="mt-3 font-semibold">{v.title}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{v.text}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <p className="mt-12 text-center text-sm text-muted-foreground">
          FinPilot is a fictional product demo built to showcase a complete personal-finance frontend.
        </p>
      </div>
    </div>
  )
}
