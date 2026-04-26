import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/deals/best-today
// Retourne le meilleur deal du jour : marge max, trouvé aujourd'hui, statut new
export async function GET() {
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)

  const deal = await prisma.deal.findFirst({
    where: {
      status: 'new',
      margin: { not: null },
      foundAt: { gte: startOfDay },
    },
    include: { search: { select: { name: true, isGlobal: true } } },
    orderBy: { margin: 'desc' },
  })

  // Si aucun deal aujourd'hui, on prend le meilleur de la semaine
  if (!deal) {
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    const fallback = await prisma.deal.findFirst({
      where: {
        status: 'new',
        margin: { not: null },
        foundAt: { gte: weekAgo },
      },
      include: { search: { select: { name: true, isGlobal: true } } },
      orderBy: { margin: 'desc' },
    })
    return NextResponse.json({ deal: fallback, scope: 'week' })
  }

  return NextResponse.json({ deal, scope: 'today' })
}
