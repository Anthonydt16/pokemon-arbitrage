// GET /api/deals/global — public endpoint, no auth required
// Returns deals from isGlobal searches for the landing page
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const globalSearches = await prisma.search.findMany({
    where: { isGlobal: true, active: true },
    select: { id: true, name: true },
  })

  const searchIds = globalSearches.map(s => s.id)

  if (searchIds.length === 0) {
    return NextResponse.json({ searches: [], deals: [] })
  }

  const deals = await prisma.deal.findMany({
    where: {
      searchId: { in: searchIds },
      status: { not: 'archived' },
    },
    orderBy: { foundAt: 'desc' },
    take: 50,
    include: {
      search: { select: { id: true, name: true, isGlobal: true } },
    },
  })

  return NextResponse.json({
    searches: globalSearches,
    deals,
  })
}
