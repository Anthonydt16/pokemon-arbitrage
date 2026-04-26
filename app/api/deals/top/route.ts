import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/deals/top — Top 5 global (isGlobal=true) + Top 5 personal
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

  return NextResponse.json({ global: globalDeals, personal: personalDeals })
}
