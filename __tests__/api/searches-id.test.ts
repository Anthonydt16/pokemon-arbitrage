/**
 * __tests__/api/searches-id.test.ts
 * Tests GET + PATCH + DELETE /api/searches/[id]
 */

import { NextRequest } from 'next/server'

const mockPrisma = {
  search: {
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}
jest.mock('@/lib/prisma', () => ({ prisma: mockPrisma }))

import { GET, PATCH, DELETE } from '@/app/api/searches/[id]/route'

const makeParams = (id: string) => ({ params: Promise.resolve({ id }) })

const MOCK_SEARCH = {
  id: 'search-1',
  name: 'Dracaufeu',
  keywords: '["dracaufeu"]',
  platforms: '["vinted"]',
  minPrice: 0,
  maxPrice: 150,
  active: true,
  isGlobal: false,
  lastAvgPrice: null,
  lastScrapeAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('GET /api/searches/[id]', () => {
  beforeEach(() => jest.clearAllMocks())

  it('retourne 404 si introuvable', async () => {
    mockPrisma.search.findUnique.mockResolvedValue(null)
    const req = new NextRequest('http://localhost:3001/api/searches/xxx', { method: 'GET' })
    const res = await GET(req, makeParams('xxx'))
    expect(res.status).toBe(404)
  })

  it('retourne la search avec keywords/platforms parsés', async () => {
    mockPrisma.search.findUnique.mockResolvedValue(MOCK_SEARCH)
    const req = new NextRequest('http://localhost:3001/api/searches/search-1', { method: 'GET' })
    const res = await GET(req, makeParams('search-1'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.keywords).toEqual(['dracaufeu'])
    expect(data.platforms).toEqual(['vinted'])
  })
})

describe('PATCH /api/searches/[id]', () => {
  beforeEach(() => jest.clearAllMocks())

  it('met à jour le nom', async () => {
    const updated = { ...MOCK_SEARCH, name: 'Pikachu' }
    mockPrisma.search.update.mockResolvedValue(updated)
    const req = new NextRequest('http://localhost:3001/api/searches/search-1', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Pikachu' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await PATCH(req, makeParams('search-1'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.name).toBe('Pikachu')
  })

  it('stringify bien keywords avant update', async () => {
    mockPrisma.search.update.mockResolvedValue({ ...MOCK_SEARCH, keywords: '["etb","pikachu"]' })
    const req = new NextRequest('http://localhost:3001/api/searches/search-1', {
      method: 'PATCH',
      body: JSON.stringify({ keywords: ['etb', 'pikachu'] }),
      headers: { 'Content-Type': 'application/json' },
    })
    await PATCH(req, makeParams('search-1'))
    const callData = mockPrisma.search.update.mock.calls[0][0].data
    expect(typeof callData.keywords).toBe('string')
    expect(JSON.parse(callData.keywords)).toEqual(['etb', 'pikachu'])
  })

  it('toggle active', async () => {
    mockPrisma.search.update.mockResolvedValue({ ...MOCK_SEARCH, active: false })
    const req = new NextRequest('http://localhost:3001/api/searches/search-1', {
      method: 'PATCH',
      body: JSON.stringify({ active: false }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await PATCH(req, makeParams('search-1'))
    const data = await res.json()
    expect(data.active).toBe(false)
  })
})

describe('DELETE /api/searches/[id]', () => {
  beforeEach(() => jest.clearAllMocks())

  it('supprime et retourne ok', async () => {
    mockPrisma.search.delete.mockResolvedValue(MOCK_SEARCH)
    const req = new NextRequest('http://localhost:3001/api/searches/search-1', { method: 'DELETE' })
    const res = await DELETE(req, makeParams('search-1'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.ok).toBe(true)
    expect(mockPrisma.search.delete).toHaveBeenCalledWith({ where: { id: 'search-1' } })
  })
})
