/**
 * __tests__/api/searches.test.ts
 * Tests des routes API /api/searches
 */

import { NextRequest } from 'next/server'

// Mock Prisma
const mockPrisma = {
  search: {
    findMany: jest.fn(),
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}
jest.mock('@/lib/prisma', () => ({ prisma: mockPrisma }))

import { GET, POST } from '@/app/api/searches/route'

const MOCK_SEARCH = {
  id: 'test-id-1',
  name: 'Dracaufeu',
  keywords: JSON.stringify(['dracaufeu']),
  platforms: JSON.stringify(['leboncoin', 'vinted']),
  minPrice: 10,
  maxPrice: 150,
  active: true,
  isGlobal: false,
  lastAvgPrice: null,
  lastScrapeAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  _count: { deals: 3 },
}

describe('GET /api/searches', () => {
  beforeEach(() => jest.clearAllMocks())

  it('retourne une liste de searches avec keywords/platforms parsés', async () => {
    mockPrisma.search.findMany.mockResolvedValue([MOCK_SEARCH])

    const res = await GET()
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(Array.isArray(data)).toBe(true)
    expect(data[0].keywords).toEqual(['dracaufeu'])
    expect(data[0].platforms).toEqual(['leboncoin', 'vinted'])
  })

  it('retourne un tableau vide si aucune search', async () => {
    mockPrisma.search.findMany.mockResolvedValue([])
    const res = await GET()
    const data = await res.json()
    expect(data).toEqual([])
  })
})

describe('POST /api/searches', () => {
  beforeEach(() => jest.clearAllMocks())

  it('crée une search et retourne les keywords parsés', async () => {
    const body = {
      name: 'Test ETB',
      keywords: ['etb', 'pikachu'],
      platforms: ['vinted', 'ebay'],
      minPrice: 20,
      maxPrice: 100,
      active: true,
    }
    mockPrisma.search.create.mockResolvedValue({
      ...MOCK_SEARCH,
      name: body.name,
      keywords: JSON.stringify(body.keywords),
      platforms: JSON.stringify(body.platforms),
    })

    const req = new NextRequest('http://localhost:3001/api/searches', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    })

    const res = await POST(req)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.keywords).toEqual(body.keywords)
    expect(data.platforms).toEqual(body.platforms)
    expect(mockPrisma.search.create).toHaveBeenCalledTimes(1)
  })

  it('stringify bien les keywords et platforms avant sauvegarde', async () => {
    const body = { name: 'Test', keywords: ['a', 'b'], platforms: ['vinted'], minPrice: 0, maxPrice: 50, active: true }
    mockPrisma.search.create.mockResolvedValue({ ...MOCK_SEARCH, keywords: '["a","b"]', platforms: '["vinted"]' })

    const req = new NextRequest('http://localhost:3001/api/searches', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    })
    await POST(req)

    const callArgs = mockPrisma.search.create.mock.calls[0][0]
    expect(typeof callArgs.data.keywords).toBe('string')
    expect(typeof callArgs.data.platforms).toBe('string')
  })
})
