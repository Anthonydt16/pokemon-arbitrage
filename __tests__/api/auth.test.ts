/**
 * __tests__/api/auth.test.ts
 * Tests des routes POST /api/auth/register et POST /api/auth/login
 */

import { NextRequest } from 'next/server'

// Mock bcryptjs
const mockBcrypt = {
  hash: jest.fn(async (pw: string) => `hashed_${pw}`),
  compare: jest.fn(),
}
jest.mock('bcryptjs', () => mockBcrypt)

// Mock Prisma
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
}
jest.mock('@/lib/prisma', () => ({ prisma: mockPrisma }))

// Mock auth (signToken)
jest.mock('@/lib/auth', () => ({
  signToken: jest.fn(() => 'mock-jwt-token'),
  verifyToken: jest.fn(),
  getAuthUser: jest.fn(),
}))

import { POST as register } from '@/app/api/auth/register/route'
import { POST as login } from '@/app/api/auth/login/route'

const makeRegisterReq = (body: object) => new NextRequest('http://localhost:3001/api/auth/register', {
  method: 'POST',
  body: JSON.stringify(body),
  headers: { 'Content-Type': 'application/json' },
})

const makeLoginReq = (body: object) => new NextRequest('http://localhost:3001/api/auth/login', {
  method: 'POST',
  body: JSON.stringify(body),
  headers: { 'Content-Type': 'application/json' },
})

const MOCK_USER = {
  id: 'user-cuid-1',
  email: 'ash@pokemon.com',
  password: 'hashed_password123',
  createdAt: new Date(),
}

describe('POST /api/auth/register', () => {
  beforeEach(() => jest.clearAllMocks())

  it('crée un compte et retourne un token JWT', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null) // no existing user
    mockPrisma.user.create.mockResolvedValue(MOCK_USER)

    const res = await register(makeRegisterReq({ email: 'ash@pokemon.com', password: 'password123' }))
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.token).toBe('mock-jwt-token')
    expect(data.email).toBe('ash@pokemon.com')
    expect(data.userId).toBe(MOCK_USER.id)
  })

  it('retourne 409 si l\'email est déjà utilisé', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(MOCK_USER) // already exists

    const res = await register(makeRegisterReq({ email: 'ash@pokemon.com', password: 'password123' }))
    expect(res.status).toBe(409)
    const data = await res.json()
    expect(data.error).toBeDefined()
  })

  it('retourne 400 si email ou password manquant', async () => {
    const res = await register(makeRegisterReq({ email: 'ash@pokemon.com' }))
    expect(res.status).toBe(400)
  })

  it('hash le mot de passe avant la création', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null)
    mockPrisma.user.create.mockResolvedValue(MOCK_USER)

    await register(makeRegisterReq({ email: 'ash@pokemon.com', password: 'mypassword' }))

    expect(mockBcrypt.hash).toHaveBeenCalledWith('mypassword', 12)
    const createData = mockPrisma.user.create.mock.calls[0][0].data
    expect(createData.password).toBe('hashed_mypassword')
  })
})

describe('POST /api/auth/login', () => {
  beforeEach(() => jest.clearAllMocks())

  it('login réussi — retourne un token JWT', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(MOCK_USER)
    mockBcrypt.compare.mockResolvedValue(true)

    const res = await login(makeLoginReq({ email: 'ash@pokemon.com', password: 'password123' }))
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.token).toBe('mock-jwt-token')
    expect(data.email).toBe('ash@pokemon.com')
  })

  it('retourne 401 si l\'utilisateur n\'existe pas', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null)

    const res = await login(makeLoginReq({ email: 'unknown@example.com', password: 'pw' }))
    expect(res.status).toBe(401)
  })

  it('retourne 401 si le mot de passe est incorrect', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(MOCK_USER)
    mockBcrypt.compare.mockResolvedValue(false)

    const res = await login(makeLoginReq({ email: 'ash@pokemon.com', password: 'wrongpassword' }))
    expect(res.status).toBe(401)
  })

  it('retourne 400 si champs manquants', async () => {
    const res = await login(makeLoginReq({ email: 'ash@pokemon.com' }))
    expect(res.status).toBe(400)
  })
})
