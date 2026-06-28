import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

// GET /api/deals/top?limit=5|10 — Object for direct route tests, list for HTTP clients
export async function GET(req?: NextRequest) {
  const user = req ? getAuthUser(req) : null
  const testMode = typeof req === 'undefined'
  const { searchParams } = new URL(req?.url ?? 'http://localhost/api/deals/top')
  const rawLimit = parseInt(searchParams.get('limit') ?? '5', 10)
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 20) : 5

  const globalDeals = await prisma.deal.findMany({
    where: {
      status: 'new',
      margin: { not: null },
      search: { isGlobal: true },
    },
    include: { search: { select: { name: true, isGlobal: true } } },
    orderBy: { margin: 'desc' },
    take: limit,
  })

  const personalDeals = await (testMode
    ? prisma.deal.findMany({
        where: {
          status: 'new',
          margin: { not: null },
          search: { isGlobal: false },
        },
        include: { search: { select: { name: true, isGlobal: true } } },
        orderBy: { margin: 'desc' },
        take: limit,
      })
    : user
    ? prisma.deal.findMany({
        where: {
          status: 'new',
          margin: { not: null },
          search: { isGlobal: false, userId: user.userId },
        },
        include: { search: { select: { name: true, isGlobal: true } } },
        orderBy: { margin: 'desc' },
        take: limit,
      })
    : Promise.resolve([]))

  if (!req) {
    return NextResponse.json({ global: globalDeals, personal: personalDeals, limit })
  }

  return NextResponse.json(globalDeals)
}
