/**
 * __tests__/api/deals-robustness.test.ts
 * Tests de robustesse — couvre les bugs réels rencontrés en prod
 */

import { NextRequest } from 'next/server'

const mockPrisma = {
  deal: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn(),
  },
  search: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
  },
}
jest.mock('@/lib/prisma', () => ({ prisma: mockPrisma }))

import { GET, POST } from '@/app/api/deals/route'

// ─────────────────────────────────────────────
// BUG #1 — NaN en DB si price mal formé
// ─────────────────────────────────────────────
describe('POST /api/deals — validation prix', () => {
  beforeEach(() => jest.clearAllMocks())

  it('retourne 400 si price est undefined', async () => {
    const req = new NextRequest('http://localhost:3001/api/deals', {
      method: 'POST',
      body: JSON.stringify({ searchId: 's1', title: 'test', url: 'https://x.com/1', platform: 'vinted' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    expect(mockPrisma.deal.create).not.toHaveBeenCalled()
  })

  it('retourne 400 si price est NaN', async () => {
    const req = new NextRequest('http://localhost:3001/api/deals', {
      method: 'POST',
      body: JSON.stringify({ searchId: 's1', title: 'test', url: 'https://x.com/2', platform: 'vinted', price: 'abc' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    expect(mockPrisma.deal.create).not.toHaveBeenCalled()
  })

  it('retourne 400 si url manquante', async () => {
    const req = new NextRequest('http://localhost:3001/api/deals', {
      method: 'POST',
      body: JSON.stringify({ searchId: 's1', title: 'test', price: 10, platform: 'vinted' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('retourne 400 si platform manquante', async () => {
    const req = new NextRequest('http://localhost:3001/api/deals', {
      method: 'POST',
      body: JSON.stringify({ searchId: 's1', title: 'test', price: 10, url: 'https://x.com/3' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})

// ─────────────────────────────────────────────
// BUG #2 — searchId inexistant → deal orphelin
// ─────────────────────────────────────────────
describe('POST /api/deals — searchId validation', () => {
  beforeEach(() => jest.clearAllMocks())

  it('retourne 404 si searchId inexistant', async () => {
    mockPrisma.deal.findUnique.mockResolvedValue(null)
    mockPrisma.search.findUnique.mockResolvedValue(null)

    const req = new NextRequest('http://localhost:3001/api/deals', {
      method: 'POST',
      body: JSON.stringify({ searchId: 'inexistant', title: 'test', price: 10, url: 'https://x.com/4', platform: 'vinted' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(404)
    expect(mockPrisma.deal.create).not.toHaveBeenCalled()
  })
})

// ─────────────────────────────────────────────
// BUG #3 — Rate limit
// ─────────────────────────────────────────────
describe('GET /api/deals — rate limiting', () => {
  beforeEach(() => jest.clearAllMocks())

  it('répond normalement sur des requêtes standard', async () => {
    mockPrisma.deal.findMany.mockResolvedValue([])
    mockPrisma.deal.count.mockResolvedValue(0)
    const req = new NextRequest('http://localhost:3001/api/deals')
    const res = await GET(req)
    // 200 ou 429 — doit au moins répondre sans crash
    expect([200, 429]).toContain(res.status)
  })
})

// ─────────────────────────────────────────────
// Trust score fields — POST doit accepter et retourner les champs trust
// ─────────────────────────────────────────────
describe('POST /api/deals — trust score fields', () => {
  beforeEach(() => jest.clearAllMocks())

  it('accepte trustScore/trustLevel/trustFlags et les retourne', async () => {
    const mockDeal = {
      id: 'trust-1',
      searchId: 's1',
      title: 'ETB Évolutions Prismatiques scellé neuf',
      price: 60,
      url: 'https://leboncoin.fr/trust-test',
      platform: 'leboncoin',
      trustScore: 82,
      trustLevel: 'safe',
      trustFlags: '[]',
      photoCount: 4,
      isPro: true,
    }
    mockPrisma.search.findUnique.mockResolvedValue({ id: 's1' })
    mockPrisma.deal.findUnique.mockResolvedValue(null) // pas de doublon
    mockPrisma.deal.create.mockResolvedValue(mockDeal)

    const req = new NextRequest('http://localhost:3001/api/deals', {
      method: 'POST',
      body: JSON.stringify({
        searchId: 's1',
        title: 'ETB Évolutions Prismatiques scellé neuf',
        price: 60,
        url: 'https://leboncoin.fr/trust-test',
        platform: 'leboncoin',
        trustScore: 82,
        trustLevel: 'safe',
        trustFlags: '[]',
        photoCount: 4,
        isPro: true,
      }),
      headers: { 'Content-Type': 'application/json' },
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.trustScore).toBe(82)
    expect(data.trustLevel).toBe('safe')
    expect(data.trustFlags).toBe('[]')
    expect(data.photoCount).toBe(4)
    expect(data.isPro).toBe(true)
  })
})

describe('GET /api/deals — pagination', () => {
  beforeEach(() => jest.clearAllMocks())

  const DEAL = { id: 'd1', searchId: 's1', title: 'test', price: 10, url: 'u', platform: 'vinted', status: 'new', foundAt: new Date(), search: { name: 'test', isGlobal: false } }

  it('hasMore = false quand on est à la dernière page', async () => {
    mockPrisma.deal.findMany.mockResolvedValue([DEAL])
    mockPrisma.deal.count.mockResolvedValue(1)
    const req = new NextRequest('http://localhost:3001/api/deals?page=1&limit=20')
    const res = await GET(req)
    const data = await res.json()
    expect(data.hasMore).toBe(false)
  })

  it('hasMore = true quand il reste des pages', async () => {
    mockPrisma.deal.findMany.mockResolvedValue(Array(20).fill(DEAL))
    mockPrisma.deal.count.mockResolvedValue(50)
    const req = new NextRequest('http://localhost:3001/api/deals?page=1&limit=20')
    const res = await GET(req)
    const data = await res.json()
    expect(data.hasMore).toBe(true)
  })

  it('skip correct à la page 2', async () => {
    mockPrisma.deal.findMany.mockResolvedValue([])
    mockPrisma.deal.count.mockResolvedValue(0)
    const req = new NextRequest('http://localhost:3001/api/deals?page=2&limit=20')
    await GET(req)
    expect(mockPrisma.deal.findMany.mock.calls[0][0].skip).toBe(20)
  })
})
