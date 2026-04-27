/**
 * __tests__/api/searches-id.test.ts
 * Tests GET + PATCH + DELETE /api/searches/[id] (avec auth)
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

const mockGetAuthUser = jest.fn()
jest.mock('@/lib/auth', () => ({
  getAuthUser: (req: unknown) => mockGetAuthUser(req),
  signToken: jest.fn(() => 'mock-token'),
  verifyToken: jest.fn(),
}))

import { GET, PATCH, DELETE } from '@/app/api/searches/[id]/route'

const makeParams = (id: string) => ({ params: Promise.resolve({ id }) })

const MOCK_USER = { userId: 'user-1', email: 'test@example.com' }

const MOCK_SEARCH = {
  id: 'search-1',
  name: 'Dracaufeu',
  keywords: '["dracaufeu"]',
  platforms: '["vinted"]',
  minPrice: 0,
  maxPrice: 150,
  active: true,
  isGlobal: false,
  userId: 'user-1',
  lastAvgPrice: null,
  lastScrapeAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const MOCK_GLOBAL_SEARCH = {
  ...MOCK_SEARCH,
  id: 'global-1',
  isGlobal: true,
  userId: null,
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

  it('retourne 403 si la search est globale', async () => {
    mockGetAuthUser.mockReturnValue(MOCK_USER)
    mockPrisma.search.findUnique.mockResolvedValue(MOCK_GLOBAL_SEARCH)
    const req = new NextRequest('http://localhost:3001/api/searches/global-1', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Hack' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await PATCH(req, makeParams('global-1'))
    expect(res.status).toBe(403)
  })

  it('retourne 403 si l\'user n\'est pas propriétaire', async () => {
    mockGetAuthUser.mockReturnValue({ userId: 'other-user', email: 'x@x.com' })
    mockPrisma.search.findUnique.mockResolvedValue(MOCK_SEARCH) // userId: user-1
    const req = new NextRequest('http://localhost:3001/api/searches/search-1', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Hack' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await PATCH(req, makeParams('search-1'))
    expect(res.status).toBe(403)
  })

  it('met à jour le nom si propriétaire', async () => {
    mockGetAuthUser.mockReturnValue(MOCK_USER)
    mockPrisma.search.findUnique.mockResolvedValue(MOCK_SEARCH)
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
    mockGetAuthUser.mockReturnValue(MOCK_USER)
    mockPrisma.search.findUnique.mockResolvedValue(MOCK_SEARCH)
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
})

describe('DELETE /api/searches/[id]', () => {
  beforeEach(() => jest.clearAllMocks())

  it('retourne 403 si la search est globale', async () => {
    mockGetAuthUser.mockReturnValue(MOCK_USER)
    mockPrisma.search.findUnique.mockResolvedValue(MOCK_GLOBAL_SEARCH)
    const req = new NextRequest('http://localhost:3001/api/searches/global-1', { method: 'DELETE' })
    const res = await DELETE(req, makeParams('global-1'))
    expect(res.status).toBe(403)
    expect(mockPrisma.search.delete).not.toHaveBeenCalled()
  })

  it('retourne 403 si l\'user n\'est pas propriétaire', async () => {
    mockGetAuthUser.mockReturnValue({ userId: 'hacker', email: 'h@h.com' })
    mockPrisma.search.findUnique.mockResolvedValue(MOCK_SEARCH)
    const req = new NextRequest('http://localhost:3001/api/searches/search-1', { method: 'DELETE' })
    const res = await DELETE(req, makeParams('search-1'))
    expect(res.status).toBe(403)
    expect(mockPrisma.search.delete).not.toHaveBeenCalled()
  })

  it('supprime et retourne ok si propriétaire', async () => {
    mockGetAuthUser.mockReturnValue(MOCK_USER)
    mockPrisma.search.findUnique.mockResolvedValue(MOCK_SEARCH)
    mockPrisma.search.delete.mockResolvedValue(MOCK_SEARCH)
    const req = new NextRequest('http://localhost:3001/api/searches/search-1', { method: 'DELETE' })
    const res = await DELETE(req, makeParams('search-1'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.ok).toBe(true)
  })
})
