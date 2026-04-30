import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/deals/top — Top 5 global (isGlobal=true) + Top 5 personal
// NOTE: Historically this endpoint returned an object { global, personal }
// but some consumers/tests expect a flat list. To be compatible we return
// a flat list of deals (global first then personal). If clients need the
// grouped structure, they can filter by deal.search.isGlobal.
export async function GET() {
  const [globalDeals, personalDeals] = await Promise.all([
    prisma.deal.findMany({
      where: {
        status: 'new',
        margin: { not: null },
        search: { isGlobal: true },
      },
      include: { search: { select: { name: true, isGlobal: true } } },
      orderBy: { margin: 'desc' },
      take: 5,
    }),
    prisma.deal.findMany({
      where: {
        status: 'new',
        margin: { not: null },
        search: { isGlobal: false },
      },
      include: { search: { select: { name: true, isGlobal: true } } },
      orderBy: { margin: 'desc' },
      take: 5,
    }),
  ])

  // Return a flat array for compatibility with tests/clients expecting a list
  const merged = [...globalDeals, ...personalDeals]
  return NextResponse.json(merged)
}
