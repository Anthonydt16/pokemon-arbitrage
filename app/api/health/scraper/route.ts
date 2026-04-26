import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const result = await prisma.search.findFirst({
    where: { lastScrapeAt: { not: null } },
    orderBy: { lastScrapeAt: 'desc' },
    select: { lastScrapeAt: true },
  })

  const lastScrapeAt = result?.lastScrapeAt ?? null
  let staleSince: number | null = null
  let ok = false

  if (lastScrapeAt) {
    staleSince = Math.floor((Date.now() - new Date(lastScrapeAt).getTime()) / 60_000)
    ok = staleSince < 20
  }

  return NextResponse.json({ ok, lastScrapeAt, staleSince })
}
