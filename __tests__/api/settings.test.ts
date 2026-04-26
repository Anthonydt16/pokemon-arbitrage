/**
 * __tests__/api/settings.test.ts
 * Tests des routes API /api/settings
 */

import { NextRequest } from 'next/server'

const MOCK_SETTINGS = {
  id: 'default',
  discordWebhook: null,
  alertMinMargin: 15,
  alertGlobal: true,
  updatedAt: new Date(),
}

const mockPrisma = {
  settings: {
    upsert: jest.fn(),
    findUnique: jest.fn(),
  },
}
jest.mock('@/lib/prisma', () => ({ prisma: mockPrisma }))

// Mock fetch pour le test du webhook Discord
global.fetch = jest.fn()

import { GET, PATCH, POST } from '@/app/api/settings/route'

describe('GET /api/settings', () => {
  beforeEach(() => jest.clearAllMocks())

  it('retourne les settings avec discordWebhookSet=false quand aucun webhook', async () => {
    mockPrisma.settings.upsert.mockResolvedValue(MOCK_SETTINGS)
    const res = await GET()
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.discordWebhookSet).toBe(false)
    expect(data.discordWebhook).toBeNull()
    expect(data.alertMinMargin).toBe(15)
    expect(data.alertGlobal).toBe(true)
  })

  it('masque le token du webhook dans la réponse', async () => {
    mockPrisma.settings.upsert.mockResolvedValue({
      ...MOCK_SETTINGS,
      discordWebhook: 'https://discord.com/api/webhooks/123456/AbCdEfGhIjKlMnOp',
    })
    const res = await GET()
    const data = await res.json()

    expect(data.discordWebhookSet).toBe(true)
    // Le vrai token ne doit pas être exposé
    expect(data.discordWebhook).not.toContain('AbCdEfGhIjKlMnOp')
    expect(data.discordWebhook).toContain('****')
  })
})

describe('PATCH /api/settings', () => {
  beforeEach(() => jest.clearAllMocks())

  it('met à jour alertMinMargin et alertGlobal', async () => {
    mockPrisma.settings.upsert.mockResolvedValue({ ...MOCK_SETTINGS, alertMinMargin: 30, alertGlobal: false })

    const req = new NextRequest('http://localhost:3001/api/settings', {
      method: 'PATCH',
      body: JSON.stringify({ alertMinMargin: 30, alertGlobal: false }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await PATCH(req)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.ok).toBe(true)
  })

  it('accepte une URL webhook Discord valide', async () => {
    mockPrisma.settings.upsert.mockResolvedValue({
      ...MOCK_SETTINGS,
      discordWebhook: 'https://discord.com/api/webhooks/123/token',
    })

    const req = new NextRequest('http://localhost:3001/api/settings', {
      method: 'PATCH',
      body: JSON.stringify({ discordWebhook: 'https://discord.com/api/webhooks/123/token' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await PATCH(req)
    expect(res.status).toBe(200)
  })

  it('rejette une URL webhook non-Discord', async () => {
    const req = new NextRequest('http://localhost:3001/api/settings', {
      method: 'PATCH',
      body: JSON.stringify({ discordWebhook: 'https://malicious.com/webhook' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await PATCH(req)
    expect(res.status).toBe(400)
  })

  it('accepte une URL discordapp.com aussi', async () => {
    mockPrisma.settings.upsert.mockResolvedValue({
      ...MOCK_SETTINGS,
      discordWebhook: 'https://discordapp.com/api/webhooks/123/token',
    })
    const req = new NextRequest('http://localhost:3001/api/settings', {
      method: 'PATCH',
      body: JSON.stringify({ discordWebhook: 'https://discordapp.com/api/webhooks/123/token' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await PATCH(req)
    expect(res.status).toBe(200)
  })
})

describe('POST /api/settings (test webhook)', () => {
  beforeEach(() => jest.clearAllMocks())

  it('retourne 400 si aucun webhook configuré', async () => {
    mockPrisma.settings.upsert.mockResolvedValue(MOCK_SETTINGS)
    const res = await POST()
    expect(res.status).toBe(400)
  })

  it('envoie un message de test sur Discord si webhook configuré', async () => {
    mockPrisma.settings.upsert.mockResolvedValue({
      ...MOCK_SETTINGS,
      discordWebhook: 'https://discord.com/api/webhooks/123/token',
    })
    ;(global.fetch as jest.Mock).mockResolvedValue({ ok: true, status: 204 })

    const res = await POST()
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.ok).toBe(true)
    expect(global.fetch).toHaveBeenCalledWith(
      'https://discord.com/api/webhooks/123/token',
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('retourne 400 si Discord répond avec une erreur', async () => {
    mockPrisma.settings.upsert.mockResolvedValue({
      ...MOCK_SETTINGS,
      discordWebhook: 'https://discord.com/api/webhooks/123/token',
    })
    ;(global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 401 })

    const res = await POST()
    expect(res.status).toBe(400)
  })
})
