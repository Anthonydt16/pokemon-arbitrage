import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const search = await prisma.search.findUnique({ where: { id } })
  if (!search) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({
    ...search,
    keywords: JSON.parse(search.keywords),
    platforms: JSON.parse(search.platforms),
  })
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const data: Record<string, unknown> = {}
  if (body.name !== undefined) data.name = body.name
  if (body.keywords !== undefined) data.keywords = JSON.stringify(body.keywords)
  if (body.platforms !== undefined) data.platforms = JSON.stringify(body.platforms)
  if (body.minPrice !== undefined) data.minPrice = parseFloat(body.minPrice)
  if (body.maxPrice !== undefined) data.maxPrice = parseFloat(body.maxPrice)
  if (body.active !== undefined) data.active = body.active
  const search = await prisma.search.update({ where: { id }, data })
  return NextResponse.json({
    ...search,
    keywords: JSON.parse(search.keywords),
    platforms: JSON.parse(search.platforms),
  })
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await prisma.search.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
