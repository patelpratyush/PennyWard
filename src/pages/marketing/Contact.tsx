import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Mail, MessageSquare, ShieldQuestion } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

const schema = z.object({
  name: z.string().min(2, 'Enter your name.'),
  email: z.string().email('Enter a valid email address.'),
  topic: z.string().min(1, 'Choose a topic.'),
  message: z.string().min(10, 'Tell us a little more (at least 10 characters).'),
})
type FormValues = z.infer<typeof schema>

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
    <div className="px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Contact us</h1>
          <p className="mt-3 text-muted-foreground">Questions about plans, imports, or the roadmap? We read everything.</p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          <div className="space-y-4">
            {[
              { icon: Mail, title: 'Email', text: 'support@finpilot.example' },
              { icon: MessageSquare, title: 'Response time', text: 'Within one business day' },
              { icon: ShieldQuestion, title: 'Security issues', text: 'security@finpilot.example' },
            ].map((c) => (
              <Card key={c.title} className="shadow-card">
                <CardContent className="flex gap-3 p-4">
                  <c.icon className="h-5 w-5 shrink-0 text-primary" />
                  <div>
                    <p className="text-sm font-semibold">{c.title}</p>
                    <p className="text-sm text-muted-foreground">{c.text}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="shadow-card md:col-span-2">
            <CardContent className="p-6">
              {sent ? (
                <div className="flex h-full min-h-64 flex-col items-center justify-center text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success-muted text-success">
                    <Mail className="h-6 w-6" />
                  </div>
                  <h2 className="mt-4 text-lg font-semibold">Message sent</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Thanks for reaching out — we’ll reply soon.</p>
                  <Button variant="outline" className="mt-4" onClick={() => setSent(false)}>Send another</Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="name">Name</Label>
                      <Input id="name" {...register('name')} aria-invalid={!!errors.name} />
                      {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" {...register('email')} aria-invalid={!!errors.email} />
                      {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="topic">Topic</Label>
                    <select id="topic" {...register('topic')} className="h-10 w-full rounded-md border bg-background px-3 text-sm">
                      <option value="general">General question</option>
                      <option value="billing">Billing & plans</option>
                      <option value="import">CSV import help</option>
                      <option value="feedback">Product feedback</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="message">Message</Label>
                    <Textarea id="message" rows={5} {...register('message')} aria-invalid={!!errors.message} />
                    {errors.message && <p className="text-xs text-destructive">{errors.message.message}</p>}
                  </div>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Sending…' : 'Send message'}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
