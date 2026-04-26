/**
 * __tests__/api/deals-top.test.ts
 * Tests GET /api/deals/top
 */

const mockPrisma = {
  deal: { findMany: jest.fn() },
}
jest.mock('@/lib/prisma', () => ({ prisma: mockPrisma }))

import { GET } from '@/app/api/deals/top/route'

const DEAL = (margin: number, id: string, isGlobal = false) => ({
  id, title: `deal-${id}`, price: 10, margin, status: 'new',
  url: `https://x.com/${id}`, platform: 'vinted', foundAt: new Date(),
  search: { name: 'test', isGlobal },
})

describe('GET /api/deals/top', () => {
  beforeEach(() => jest.clearAllMocks())

  it('retourne { global, personal } avec les deals triés par marge', async () => {
    const globalDeals = [90, 80, 70, 60, 50].map((m, i) => DEAL(m, `g${i}`, true))
    const personalDeals = [85, 75].map((m, i) => DEAL(m, `p${i}`, false))
    mockPrisma.deal.findMany
      .mockResolvedValueOnce(globalDeals)
      .mockResolvedValueOnce(personalDeals)

    const res = await GET()
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toHaveProperty('global')
    expect(data).toHaveProperty('personal')
    expect(data.global).toHaveLength(5)
    expect(data.personal).toHaveLength(2)
    expect(data.global[0].margin).toBe(90)
    expect(data.personal[0].margin).toBe(85)
  })

  it('retourne global=[] si aucun deal global', async () => {
    mockPrisma.deal.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([DEAL(50, 'p1', false)])

    const res = await GET()
    const data = await res.json()
    expect(data.global).toEqual([])
    expect(data.personal).toHaveLength(1)
  })

  it('retourne personal=[] si aucun deal personnel', async () => {
    mockPrisma.deal.findMany
      .mockResolvedValueOnce([DEAL(70, 'g1', true)])
      .mockResolvedValueOnce([])

    const res = await GET()
    const data = await res.json()
    expect(data.global).toHaveLength(1)
    expect(data.personal).toEqual([])
  })

  it('les deux appels filtrent bien sur isGlobal', async () => {
    mockPrisma.deal.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])

    await GET()

    const firstCall = mockPrisma.deal.findMany.mock.calls[0][0]
    const secondCall = mockPrisma.deal.findMany.mock.calls[1][0]

    expect(firstCall.where.search.isGlobal).toBe(true)
    expect(secondCall.where.search.isGlobal).toBe(false)
    expect(firstCall.where.status).toBe('new')
    expect(secondCall.where.status).toBe('new')
  })
})
