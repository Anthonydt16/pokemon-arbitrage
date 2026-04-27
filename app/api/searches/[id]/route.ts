import { NextResponse, NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const search = await prisma.search.findUnique({ where: { id } })
  if (!search) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({
    ...search,
    keywords: JSON.parse(search.keywords),
    platforms: JSON.parse(search.platforms),
  })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = getAuthUser(req)

  const search = await prisma.search.findUnique({ where: { id } })
  if (!search) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Cannot modify global searches
  if (search.isGlobal) {
    return NextResponse.json({ error: 'Modification interdite sur les recherches globales' }, { status: 403 })
  }

  // Must be authenticated and owner
  if (!user || search.userId !== user.userId) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  const body = await req.json()
  const data: Record<string, unknown> = {}
  if (body.name !== undefined) data.name = body.name
  if (body.keywords !== undefined) data.keywords = JSON.stringify(body.keywords)
  if (body.platforms !== undefined) data.platforms = JSON.stringify(body.platforms)
  if (body.minPrice !== undefined) data.minPrice = parseFloat(body.minPrice)
  if (body.maxPrice !== undefined) data.maxPrice = parseFloat(body.maxPrice)
  if (body.active !== undefined) data.active = body.active

  const updated = await prisma.search.update({ where: { id }, data })
  return NextResponse.json({
    ...updated,
    keywords: JSON.parse(updated.keywords),
    platforms: JSON.parse(updated.platforms),
  })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = getAuthUser(req)

  const search = await prisma.search.findUnique({ where: { id } })
  if (!search) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Cannot delete global searches
  if (search.isGlobal) {
    return NextResponse.json({ error: 'Suppression interdite sur les recherches globales' }, { status: 403 })
  }

  // Must be authenticated and owner
  if (!user || search.userId !== user.userId) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  await prisma.search.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
