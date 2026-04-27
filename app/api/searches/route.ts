// app/api/searches/route.ts
import { NextResponse, NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

const SCRAPER_API_KEY = process.env.SCRAPER_API_KEY || 'scraper-internal-key-2026'

function isScraperRequest(req: NextRequest): boolean {
  return req.headers.get('x-scraper-key') === SCRAPER_API_KEY
}

export async function GET(req: NextRequest) {
  const user = getAuthUser(req)
  
  if (!user) {
    // Unauthenticated: return only global searches (read-only)
    const searches = await prisma.search.findMany({
      where: { isGlobal: true },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { deals: true } } },
    })
    return NextResponse.json(
      searches.map(s => ({
        ...s,
        keywords: JSON.parse(s.keywords),
        platforms: JSON.parse(s.platforms),
        readonly: true,
      }))
    )
  }

  // Authenticated: return user's own searches + global searches
  const [userSearches, globalSearches] = await Promise.all([
    prisma.search.findMany({
      where: { userId: user.userId, isGlobal: false },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { deals: true } } },
    }),
    prisma.search.findMany({
      where: { isGlobal: true },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { deals: true } } },
    }),
  ])

  const parse = (s: typeof userSearches[number], readonly = false) => ({
    ...s,
    keywords: JSON.parse(s.keywords),
    platforms: JSON.parse(s.platforms),
    readonly,
  })

  return NextResponse.json([
    ...globalSearches.map(s => parse(s, true)),
    ...userSearches.map(s => parse(s, false)),
  ])
}

export async function POST(req: NextRequest) {
  const user = getAuthUser(req)
  const scraper = isScraperRequest(req)

  if (!user && !scraper) {
    return NextResponse.json({ error: 'Authentification requise' }, { status: 401 })
  }

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
      isGlobal: scraper ? (body.isGlobal ?? false) : false, // only scraper can set isGlobal
      userId: scraper ? null : user!.userId,
    },
  })
  return NextResponse.json({
    ...search,
    keywords: JSON.parse(search.keywords),
    platforms: JSON.parse(search.platforms),
    readonly: false,
  })
}
