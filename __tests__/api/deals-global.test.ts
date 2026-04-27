/**
 * __tests__/api/deals-global.test.ts
 * Tests GET /api/deals/global — accessible sans auth
 */

import { NextRequest } from 'next/server'

const mockPrisma = {
  search: {
    findMany: jest.fn(),
  },
  deal: {
    findMany: jest.fn(),
  },
}
jest.mock('@/lib/prisma', () => ({ prisma: mockPrisma }))

import { GET } from '@/app/api/deals/global/route'

const MOCK_GLOBAL_SEARCH = {
  id: 'global-1',
  name: 'ETB — Toutes collections',
}

const MOCK_DEAL = {
  id: 'deal-1',
  searchId: 'global-1',
  title: 'ETB Prismatique neuf scellé',
  price: 85.0,
  url: 'https://vinted.fr/1',
  platform: 'vinted',
  imageUrl: null,
  cardMarketPrice: null,
  margin: null,
  location: null,
  status: 'new',
  foundAt: new Date(),
  search: { id: 'global-1', name: 'ETB — Toutes collections', isGlobal: true },
}

describe('GET /api/deals/global', () => {
  beforeEach(() => jest.clearAllMocks())

  it('est accessible sans authentification', async () => {
    mockPrisma.search.findMany.mockResolvedValue([MOCK_GLOBAL_SEARCH])
    mockPrisma.deal.findMany.mockResolvedValue([MOCK_DEAL])

    // No auth header
    const req = new NextRequest('http://localhost:3001/api/deals/global', { method: 'GET' })
    const res = await GET(req)

    expect(res.status).toBe(200)
  })

  it('retourne les deals des recherches globales', async () => {
    mockPrisma.search.findMany.mockResolvedValue([MOCK_GLOBAL_SEARCH])
    mockPrisma.deal.findMany.mockResolvedValue([MOCK_DEAL])

    const res = await GET(new NextRequest('http://localhost:3001/api/deals/global'))
    const data = await res.json()

    expect(data.searches).toHaveLength(1)
    expect(data.searches[0].name).toBe('ETB — Toutes collections')
    expect(data.deals).toHaveLength(1)
    expect(data.deals[0].title).toBe('ETB Prismatique neuf scellé')
  })

  it('retourne des tableaux vides si aucune recherche globale', async () => {
    mockPrisma.search.findMany.mockResolvedValue([])

    const res = await GET(new NextRequest('http://localhost:3001/api/deals/global'))
    const data = await res.json()

    expect(data.searches).toEqual([])
    expect(data.deals).toEqual([])
    // Should not call deal.findMany when no searches
    expect(mockPrisma.deal.findMany).not.toHaveBeenCalled()
  })

  it('la réponse contient les clés attendues', async () => {
    mockPrisma.search.findMany.mockResolvedValue([MOCK_GLOBAL_SEARCH])
    mockPrisma.deal.findMany.mockResolvedValue([MOCK_DEAL])

    const res = await GET(new NextRequest('http://localhost:3001/api/deals/global'))
    const data = await res.json()

    expect(data).toHaveProperty('searches')
    expect(data).toHaveProperty('deals')
    expect(Array.isArray(data.searches)).toBe(true)
    expect(Array.isArray(data.deals)).toBe(true)
  })
})
