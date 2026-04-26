import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const deal = await prisma.deal.update({
    where: { id },
    data: { status: body.status },
  })
  return NextResponse.json(deal)
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await prisma.deal.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
