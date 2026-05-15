import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { signToken } from '@/lib/auth'

const PASSWORD_RULE = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/

export async function POST(req: Request) {
  const { email, password } = await req.json()
  if (!email || !password) {
    return NextResponse.json({ error: 'Email et mot de passe requis' }, { status: 400 })
  }
  if (!PASSWORD_RULE.test(String(password))) {
    return NextResponse.json({ error: 'Le mot de passe doit contenir au moins 8 caractères, une lettre et un chiffre' }, { status: 400 })
  }
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json({ error: 'Email déjà utilisé' }, { status: 409 })
  }
  const hashed = await bcrypt.hash(password, 12)
  const user = await prisma.user.create({
    data: { email, password: hashed },
  })
  const token = signToken({ userId: user.id, email: user.email })
  return NextResponse.json({ token, userId: user.id, email: user.email })
}
