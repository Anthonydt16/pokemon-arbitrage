import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// ── Rate limiting in-memory ──────────────────────────────────────────────────
const rateLimitMap = new Map<string, { count: number; reset: number }>()
function rateLimit(ip: string, max = 60, windowMs = 60_000): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip) ?? { count: 0, reset: now + windowMs }
  if (now > entry.reset) { entry.count = 0; entry.reset = now + windowMs }
  entry.count++
  rateLimitMap.set(ip, entry)
  return entry.count <= max
}

export async function GET(req: Request) {
  const ip = (req as any).headers?.get?.('x-forwarded-for') ?? '127.0.0.1'
  if (!rateLimit(ip)) return NextResponse.json({ error: 'rate_limited' }, { status: 429 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') || undefined
  const platform = searchParams.get('platform') || undefined
  const searchId = searchParams.get('searchId') || undefined
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '50')
  const skip = (page - 1) * limit

  const where = {
    ...(status && { status }),
    ...(platform && { platform }),
    ...(searchId && { searchId }),
  }

  const [deals, total] = await Promise.all([
    prisma.deal.findMany({
      where,
      include: { search: { select: { name: true, isGlobal: true } } },
      orderBy: { foundAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.deal.count({ where }),
  ])

  return NextResponse.json({
    deals,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    hasMore: skip + deals.length < total,
  })
}

export async function POST(req: Request) {
  const ip = (req as any).headers?.get?.('x-forwarded-for') ?? '127.0.0.1'
  if (!rateLimit(ip)) return NextResponse.json({ error: 'rate_limited' }, { status: 429 })

  const body = await req.json()
  const { searchId, title, price, url, platform, imageUrl, cardMarketPrice, margin, location,
          trustScore, trustLevel, trustFlags, photoCount, isPro } = body

  // Validation des champs obligatoires
  if (!searchId || !title || !url || !platform || price === undefined || isNaN(parseFloat(String(price)))) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 })
  }

  // Vérification que la Search existe
  const search = await prisma.search.findUnique({ where: { id: searchId } })
  if (!search) return NextResponse.json({ error: 'search_not_found' }, { status: 404 })

  // Check duplicate
  const existing = await prisma.deal.findUnique({ where: { url } })
  if (existing) return NextResponse.json({ error: 'duplicate' }, { status: 409 })

  const deal = await prisma.deal.create({
    data: {
      searchId,
      title,
      price: parseFloat(price),
      url,
      platform,
      imageUrl: imageUrl || null,
      cardMarketPrice: cardMarketPrice ? parseFloat(cardMarketPrice) : null,
      margin: margin ? parseFloat(margin) : null,
      location: location || null,
      trustScore: trustScore ?? null,
      trustLevel: trustLevel ?? null,
      trustFlags: trustFlags ?? null,
      photoCount: photoCount ?? null,
      isPro: isPro ?? null,
    },
  })
  return NextResponse.json(deal)
}
