/**
 * __tests__/api/health-scraper.test.ts
 * Tests de l'endpoint /api/health/scraper
 */

const mockPrisma = {
  search: {
    findFirst: jest.fn(),
  },
}
jest.mock('@/lib/prisma', () => ({ prisma: mockPrisma }))

import { GET } from '@/app/api/health/scraper/route'

describe('GET /api/health/scraper', () => {
  beforeEach(() => jest.clearAllMocks())

  it('retourne ok=false si aucun scan', async () => {
    mockPrisma.search.findFirst.mockResolvedValue(null)
    const res = await GET()
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.ok).toBe(false)
    expect(data.lastScrapeAt).toBeNull()
  })

  it('retourne ok=true si dernier scan < 20 min', async () => {
    const recent = new Date(Date.now() - 10 * 60 * 1000) // 10 min ago
    mockPrisma.search.findFirst.mockResolvedValue({ lastScrapeAt: recent })
    const res = await GET()
    const data = await res.json()
    expect(data.ok).toBe(true)
    expect(data.staleSince).toBeLessThan(20)
  })

  it('retourne ok=false si dernier scan > 20 min', async () => {
    const old = new Date(Date.now() - 30 * 60 * 1000) // 30 min ago
    mockPrisma.search.findFirst.mockResolvedValue({ lastScrapeAt: old })
    const res = await GET()
    const data = await res.json()
    expect(data.ok).toBe(false)
    expect(data.staleSince).toBeGreaterThanOrEqual(20)
  })
})
