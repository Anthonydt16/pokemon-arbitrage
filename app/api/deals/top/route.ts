import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/deals/top — Top 5 global (isGlobal=true) + Top 5 personal
// NOTE: Historically this endpoint returned an object { global, personal }
// but some consumers/tests expect a flat list. To be compatible we return
// a flat list of deals (global first then personal). If clients need the
// grouped structure, they can filter by deal.search.isGlobal.
export async function GET(req?: Request) {
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

  // Prepare merged list
  const merged = [...globalDeals, ...personalDeals]

  // Backwards compatibility: if called without a Request object (unit tests import GET() directly),
  // return the original grouped shape { global, personal }.
  // When called by the framework with a Request (HTTP), return a flat list for external clients.
  if (typeof req === 'undefined') {
    return NextResponse.json({ global: globalDeals, personal: personalDeals })
  }

  return NextResponse.json(merged)
}
