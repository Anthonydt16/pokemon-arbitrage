/**
 * __tests__/api/deals.test.ts
 * Tests des routes API /api/deals
 */

import { NextRequest } from 'next/server'

const mockPrisma = {
  deal: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn(),
  },
  search: {
    findUnique: jest.fn(),
  },
}
jest.mock('@/lib/prisma', () => ({ prisma: mockPrisma }))

import { GET, POST } from '@/app/api/deals/route'

const MOCK_DEAL = {
  id: 'deal-1',
  searchId: 'search-1',
  title: 'ETB Évolutions Prismatiques scellé neuf',
  price: 75,
  url: 'https://vinted.fr/items/123',
  platform: 'vinted',
  imageUrl: null,
  cardMarketPrice: 100,
  margin: 25,
  location: null,
  status: 'new',
  foundAt: new Date('2026-04-26T10:00:00Z'),
  search: { name: 'ETB Évolutions', isGlobal: false },
}

describe('GET /api/deals', () => {
  beforeEach(() => jest.clearAllMocks())

  it('retourne les deals paginés avec la bonne structure', async () => {
    mockPrisma.deal.findMany.mockResolvedValue([MOCK_DEAL])
    mockPrisma.deal.count.mockResolvedValue(1)

    const req = new NextRequest('http://localhost:3001/api/deals?page=1&limit=50')
    const res = await GET(req)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data).toHaveProperty('deals')
    expect(data).toHaveProperty('total')
    expect(data).toHaveProperty('page')
    expect(data).toHaveProperty('hasMore')
    expect(Array.isArray(data.deals)).toBe(true)
    expect(data.total).toBe(1)
    expect(data.page).toBe(1)
    expect(data.hasMore).toBe(false)
  })

  it('filtre par status', async () => {
    mockPrisma.deal.findMany.mockResolvedValue([])
    mockPrisma.deal.count.mockResolvedValue(0)

    const req = new NextRequest('http://localhost:3001/api/deals?status=new')
    await GET(req)

    const callArgs = mockPrisma.deal.findMany.mock.calls[0][0]
    expect(callArgs.where.status).toBe('new')
  })

  it('filtre par platform', async () => {
    mockPrisma.deal.findMany.mockResolvedValue([])
    mockPrisma.deal.count.mockResolvedValue(0)

    const req = new NextRequest('http://localhost:3001/api/deals?platform=vinted')
    await GET(req)

    const callArgs = mockPrisma.deal.findMany.mock.calls[0][0]
    expect(callArgs.where.platform).toBe('vinted')
  })

  it('calcule hasMore correctement', async () => {
    // 60 deals total, page 1 de 50 → hasMore = true
    mockPrisma.deal.findMany.mockResolvedValue(Array(50).fill(MOCK_DEAL))
    mockPrisma.deal.count.mockResolvedValue(60)

    const req = new NextRequest('http://localhost:3001/api/deals?page=1&limit=50')
    const res = await GET(req)
    const data = await res.json()
    expect(data.hasMore).toBe(true)
  })
})

describe('POST /api/deals', () => {
  beforeEach(() => jest.clearAllMocks())

  it('crée un deal correctement', async () => {
    mockPrisma.search.findUnique.mockResolvedValue({ id: 'search-1' }) // search existe
    mockPrisma.deal.findUnique.mockResolvedValue(null) // pas de doublon
    mockPrisma.deal.create.mockResolvedValue(MOCK_DEAL)

    const body = {
      searchId: 'search-1',
      title: 'ETB scellé neuf',
      price: 75,
      url: 'https://vinted.fr/items/123',
      platform: 'vinted',
      cardMarketPrice: 100,
      margin: 25,
    }
    const req = new NextRequest('http://localhost:3001/api/deals', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(mockPrisma.deal.create).toHaveBeenCalledTimes(1)
  })

  it('rejette un doublon (URL déjà en DB) avec 409', async () => {
    mockPrisma.search.findUnique.mockResolvedValue({ id: 'x' }) // search existe
    mockPrisma.deal.findUnique.mockResolvedValue(MOCK_DEAL) // doublon

    const body = { searchId: 'x', title: 'ETB', price: 75, url: 'https://vinted.fr/items/123', platform: 'vinted' }
    const req = new NextRequest('http://localhost:3001/api/deals', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    })

    const res = await POST(req)
    expect(res.status).toBe(409)
    expect(mockPrisma.deal.create).not.toHaveBeenCalled()
  })

  it('retourne 400 si champs manquants', async () => {
    const body = { title: 'ETB', price: 75, url: 'https://vinted.fr/items/123', platform: 'vinted' } // pas de searchId
    const req = new NextRequest('http://localhost:3001/api/deals', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe('missing_fields')
    expect(mockPrisma.search.findUnique).not.toHaveBeenCalled()
  })

  it('retourne 404 si searchId invalide', async () => {
    mockPrisma.search.findUnique.mockResolvedValue(null) // search inexistante

    const body = { searchId: 'unknown-id', title: 'ETB', price: 75, url: 'https://vinted.fr/items/456', platform: 'vinted' }
    const req = new NextRequest('http://localhost:3001/api/deals', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    })

    const res = await POST(req)
    expect(res.status).toBe(404)
    const data = await res.json()
    expect(data.error).toBe('search_not_found')
    expect(mockPrisma.deal.create).not.toHaveBeenCalled()
  })
})

describe('DELETE /api/deals/cleanup', () => {
  beforeEach(() => jest.clearAllMocks())

  it('supprime les deals vus/ignorés > 7j et new > 30j', async () => {
    mockPrisma.deal.deleteMany
      .mockResolvedValueOnce({ count: 3 })  // vus/ignorés
      .mockResolvedValueOnce({ count: 1 })  // new expirés

    const { DELETE } = await import('@/app/api/deals/cleanup/route')
    const res = await DELETE()
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.ok).toBe(true)
    expect(data.deletedOldSeen).toBe(3)
    expect(data.deletedExpired).toBe(1)
    expect(data.total).toBe(4)
    expect(mockPrisma.deal.deleteMany).toHaveBeenCalledTimes(2)
  })
})
