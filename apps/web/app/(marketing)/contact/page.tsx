'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { ArrowUpRight, Mail, MessageSquare, ShieldQuestion, type LucideIcon } from 'lucide-react'

const schema = z.object({
  name: z.string().min(2, 'Enter your name.'),
  email: z.string().email('Enter a valid email address.'),
  topic: z.string().min(1, 'Choose a topic.'),
  message: z.string().min(10, 'Tell us a little more (at least 10 characters).'),
})
type FormValues = z.infer<typeof schema>

const channels: [LucideIcon, string, string][] = [
  [Mail, 'Email', 'support@pennyward.example'],
  [MessageSquare, 'Response time', 'Within one business day'],
  [ShieldQuestion, 'Security issues', 'security@pennyward.example'],
]

const fieldClass =
  'w-full border-0 border-b border-[var(--rule-strong)] bg-transparent px-0 py-2.5 text-[0.9375rem] text-[var(--ink)] outline-none transition-colors placeholder:text-[var(--ink-3)] focus:border-[var(--ink)]'

export default function Contact() {
  const [sent, setSent] = useState(false)
  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { topic: 'general' },
  })

  const onSubmit = async () => {
    await new Promise((r) => setTimeout(r, 700))
    setSent(true)
    toast.success('Message sent. We typically reply within one business day.')
    reset()
  }

  return (
    <div className="px-5 py-20 sm:px-8">
      <div className="mx-auto max-w-[1100px]">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.2, 0.8, 0.3, 1] }}
        >
          <div className="kicker flex items-center gap-3 text-[var(--ink-3)]">
            <span className="inline-block h-px w-10 bg-[var(--rust)]" />
            Correspondence
          </div>
          <h1 className="display mt-6 text-[2.75rem] leading-[0.96] sm:text-[3.75rem]">
            Contact <span className="display-i">us.</span>
          </h1>
          <p className="mt-6 max-w-xl text-[1.0625rem] leading-relaxed text-[var(--ink-2)]">
            Questions about plans, imports, or the roadmap? We read everything.
          </p>
        </motion.div>

        <div className="mt-16 grid gap-12 lg:grid-cols-12">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-70px' }}
            transition={{ duration: 0.5 }}
            className="border-t border-[var(--rule-strong)] pt-8 lg:col-span-4"
          >
            {channels.map(([Icon, title, text], i) => (
              <div key={title} className={`flex items-start gap-3.5 py-5 ${i > 0 ? 'border-t border-[var(--rule)]' : ''}`}>
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[var(--rust)]" strokeWidth={2} />
                <div>
                  <p className="kicker text-[var(--ink-3)]">{title}</p>
                  <p className="fig mt-1.5 text-[0.9375rem]">{text}</p>
                </div>
              </div>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-70px' }}
            transition={{ duration: 0.5, delay: 0.08 }}
            className="lg:col-span-8"
          >
            <div className="border border-[var(--ink)] bg-[var(--paper-2)] p-7 sm:p-9">
              {sent ? (
                <div className="flex min-h-64 flex-col items-center justify-center text-center">
                  <Mail className="h-8 w-8 text-[var(--moss)]" strokeWidth={1.75} />
                  <p className="display mt-5 text-[1.75rem]">Message sent.</p>
                  <p className="mt-2 max-w-xs text-sm text-[var(--ink-3)]">
                    Thanks for reaching out — we&rsquo;ll reply soon.
                  </p>
                  <button
                    type="button"
                    onClick={() => setSent(false)}
                    className="btn-ghost mt-6"
                  >
                    Send another
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-7" noValidate>
                  <div className="grid gap-7 sm:grid-cols-2">
                    <div>
                      <label htmlFor="name" className="kicker text-[var(--ink-3)]">Name</label>
                      <input id="name" {...register('name')} aria-invalid={!!errors.name} className={`${fieldClass} mt-2`} />
                      {errors.name && <p className="mt-1.5 text-xs text-[var(--rust)]">{errors.name.message}</p>}
                    </div>
                    <div>
                      <label htmlFor="email" className="kicker text-[var(--ink-3)]">Email</label>
                      <input id="email" type="email" {...register('email')} aria-invalid={!!errors.email} className={`${fieldClass} mt-2`} />
                      {errors.email && <p className="mt-1.5 text-xs text-[var(--rust)]">{errors.email.message}</p>}
                    </div>
                  </div>
                  <div>
                    <label htmlFor="topic" className="kicker text-[var(--ink-3)]">Topic</label>
                    <select id="topic" {...register('topic')} className={`${fieldClass} mt-2 cursor-pointer`}>
                      <option value="general">General question</option>
                      <option value="billing">Billing &amp; plans</option>
                      <option value="import">CSV import help</option>
                      <option value="feedback">Product feedback</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="message" className="kicker text-[var(--ink-3)]">Message</label>
                    <textarea id="message" rows={5} {...register('message')} aria-invalid={!!errors.message} className={`${fieldClass} mt-2 resize-none`} />
                    {errors.message && <p className="mt-1.5 text-xs text-[var(--rust)]">{errors.message.message}</p>}
                  </div>
                  <button type="submit" disabled={isSubmitting} className="btn-lime disabled:opacity-60">
                    {isSubmitting ? 'Sending…' : 'Send message'} <ArrowUpRight className="h-4 w-4" strokeWidth={2.5} />
                  </button>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
