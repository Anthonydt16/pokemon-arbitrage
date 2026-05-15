import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/deals/best-today
// Retourne le top 5 des deals du jour : marge max, trouvé aujourd'hui, statut new
export async function GET() {
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)

  const deals = await prisma.deal.findMany({
    where: {
      status: 'new',
      margin: { not: null },
      foundAt: { gte: startOfDay },
    },
    include: { search: { select: { name: true, isGlobal: true } } },
    orderBy: { margin: 'desc' },
    take: 5,
  })

  // Si aucun deal aujourd'hui, on prend le top 5 de la semaine
  if (deals.length === 0) {
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    const fallbackDeals = await prisma.deal.findMany({
      where: {
        status: 'new',
        margin: { not: null },
        foundAt: { gte: weekAgo },
      },
      include: { search: { select: { name: true, isGlobal: true } } },
      orderBy: { margin: 'desc' },
      take: 5,
    })
    return NextResponse.json({
      deal: fallbackDeals[0] ?? null,
      deals: fallbackDeals,
      scope: 'week',
    })
  }

  return NextResponse.json({
    deal: deals[0] ?? null,
    deals,
    scope: 'today',
  })
}
