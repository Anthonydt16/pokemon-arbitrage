// app/api/searches/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const searches = await prisma.search.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { deals: true } } },
  })
  return NextResponse.json(
    searches.map(s => ({
      ...s,
      keywords: JSON.parse(s.keywords),
      platforms: JSON.parse(s.platforms),
    }))
  )
}

export async function POST(req: Request) {
  const body = await req.json()
  const { name, keywords, platforms, minPrice, maxPrice, active } = body
  const search = await prisma.search.create({
    data: {
      name,
      keywords: JSON.stringify(keywords),
      platforms: JSON.stringify(platforms),
      minPrice: parseFloat(minPrice ?? 0),
      maxPrice: parseFloat(maxPrice),
      active: active ?? true,
      isGlobal: body.isGlobal ?? false,
    },
  })
  return NextResponse.json({
    ...search,
    keywords: JSON.parse(search.keywords),
    platforms: JSON.parse(search.platforms),
  })
}
