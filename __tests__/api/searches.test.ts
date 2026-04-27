/**
 * __tests__/api/searches.test.ts
 * Tests des routes API /api/searches (avec auth)
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

// Mock auth
const mockGetAuthUser = jest.fn()
jest.mock('@/lib/auth', () => ({
  getAuthUser: (req: unknown) => mockGetAuthUser(req),
  signToken: jest.fn(() => 'mock-token'),
  verifyToken: jest.fn(),
}))

import { GET, POST } from '@/app/api/searches/route'

const MOCK_USER = { userId: 'user-1', email: 'test@example.com' }

const MOCK_SEARCH = {
  id: 'test-id-1',
  name: 'Dracaufeu',
  keywords: JSON.stringify(['dracaufeu']),
  platforms: JSON.stringify(['leboncoin', 'vinted']),
  minPrice: 10,
  maxPrice: 150,
  active: true,
  isGlobal: false,
  userId: 'user-1',
  lastAvgPrice: null,
  lastScrapeAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  _count: { deals: 3 },
}

const MOCK_GLOBAL_SEARCH = {
  ...MOCK_SEARCH,
  id: 'global-1',
  name: 'ETB Global',
  isGlobal: true,
  userId: null,
}

const makeGetReq = (token?: string) => new NextRequest('http://localhost:3001/api/searches', {
  method: 'GET',
  headers: token ? { Authorization: `Bearer ${token}` } : {},
})

describe('GET /api/searches', () => {
  beforeEach(() => jest.clearAllMocks())

  it('sans auth — retourne uniquement les recherches globales en readonly', async () => {
    mockGetAuthUser.mockReturnValue(null)
    mockPrisma.search.findMany.mockResolvedValue([MOCK_GLOBAL_SEARCH])

    const res = await GET(makeGetReq())
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(Array.isArray(data)).toBe(true)
    expect(data[0].isGlobal).toBe(true)
    expect(data[0].readonly).toBe(true)
  })

  it('avec auth — retourne les recherches globales + celles de l\'user', async () => {
    mockGetAuthUser.mockReturnValue(MOCK_USER)
    // findMany called twice: once for user searches, once for global
    mockPrisma.search.findMany
      .mockResolvedValueOnce([MOCK_SEARCH])    // user searches
      .mockResolvedValueOnce([MOCK_GLOBAL_SEARCH]) // global searches

    const res = await GET(makeGetReq('valid-token'))
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.length).toBe(2)
    const globalResult = data.find((s: { isGlobal: boolean }) => s.isGlobal)
    const userResult = data.find((s: { isGlobal: boolean }) => !s.isGlobal)
    expect(globalResult.readonly).toBe(true)
    expect(userResult.readonly).toBe(false)
  })

  it('avec auth — retourne un tableau vide si aucune search', async () => {
    mockGetAuthUser.mockReturnValue(MOCK_USER)
    mockPrisma.search.findMany
      .mockResolvedValueOnce([]) // user searches
      .mockResolvedValueOnce([]) // global searches
    const res = await GET(makeGetReq('valid-token'))
    const data = await res.json()
    expect(data).toEqual([])
  })
})

describe('POST /api/searches', () => {
  beforeEach(() => jest.clearAllMocks())

  it('sans auth — retourne 401', async () => {
    mockGetAuthUser.mockReturnValue(null)

    const req = new NextRequest('http://localhost:3001/api/searches', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test', keywords: ['a'], platforms: ['vinted'], minPrice: 0, maxPrice: 50 }),
      headers: { 'Content-Type': 'application/json' },
    })

    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('avec auth — crée une search (isGlobal toujours false)', async () => {
    mockGetAuthUser.mockReturnValue(MOCK_USER)

    const body = {
      name: 'Test ETB',
      keywords: ['etb', 'pikachu'],
      platforms: ['vinted', 'ebay'],
      minPrice: 20,
      maxPrice: 100,
      active: true,
      isGlobal: true, // même si l'user envoie true, doit être forcé à false
    }
    mockPrisma.search.create.mockResolvedValue({
      ...MOCK_SEARCH,
      name: body.name,
      keywords: JSON.stringify(body.keywords),
      platforms: JSON.stringify(body.platforms),
      isGlobal: false,
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
    expect(data.isGlobal).toBe(false)

    // Verify isGlobal was forced to false
    const createCall = mockPrisma.search.create.mock.calls[0][0]
    expect(createCall.data.isGlobal).toBe(false)
    expect(createCall.data.userId).toBe(MOCK_USER.userId)
  })

  it('stringify bien les keywords et platforms avant sauvegarde', async () => {
    mockGetAuthUser.mockReturnValue(MOCK_USER)
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
