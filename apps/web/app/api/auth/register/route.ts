import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { db } from '@/lib/db'

const schema = z.object({ email: z.string().email(), password: z.string().min(8), name: z.string().min(1) })

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const existing = await db.user.findUnique({ where: { email: parsed.data.email } })
  if (existing) return NextResponse.json({ error: 'Email already registered' }, { status: 409 })
  const passwordHash = await bcrypt.hash(parsed.data.password, 10)
  const user = await db.user.create({ data: { email: parsed.data.email, name: parsed.data.name, passwordHash } })
  return NextResponse.json({ id: user.id }, { status: 201 })
}
