import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// DELETE /api/deals/cleanup
// Supprime les deals vus/ignorés de plus de 7 jours
// + archive les deals "new" de plus de 30 jours
export async function DELETE() {
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  // Supprime les deals vus/ignorés > 7j
  const deletedOld = await prisma.deal.deleteMany({
    where: {
      status: { in: ['seen', 'dismissed'] },
      foundAt: { lt: sevenDaysAgo },
    },
  })

  // Supprime les deals "new" > 30j (annonces probablement expirées)
  const deletedExpired = await prisma.deal.deleteMany({
    where: {
      status: 'new',
      foundAt: { lt: thirtyDaysAgo },
    },
  })

  return NextResponse.json({
    ok: true,
    deletedOldSeen: deletedOld.count,
    deletedExpired: deletedExpired.count,
    total: deletedOld.count + deletedExpired.count,
  })
}
