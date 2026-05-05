import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Authentification requise' }, { status: 401 })

  const existing = await prisma.deal.findUnique({
    where: { id },
    include: { search: { select: { isGlobal: true, userId: true } } },
  })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!existing.search.isGlobal && existing.search.userId !== user.userId) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  const body = await req.json()
  const deal = await prisma.deal.update({
    where: { id },
    data: { status: body.status },
  })
  return NextResponse.json(deal)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Authentification requise' }, { status: 401 })

  const existing = await prisma.deal.findUnique({
    where: { id },
    include: { search: { select: { isGlobal: true, userId: true } } },
  })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!existing.search.isGlobal && existing.search.userId !== user.userId) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  await prisma.deal.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
