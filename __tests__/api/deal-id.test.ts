/**
 * __tests__/api/deal-id.test.ts
 * Tests PATCH + DELETE /api/deals/[id]
 */

import { NextRequest } from 'next/server'

const mockPrisma = {
  deal: {
    update: jest.fn(),
    delete: jest.fn(),
  },
}
jest.mock('@/lib/prisma', () => ({ prisma: mockPrisma }))

import { PATCH, DELETE } from '@/app/api/deals/[id]/route'

const makeParams = (id: string) => ({ params: Promise.resolve({ id }) })

const MOCK_DEAL = { id: 'deal-1', title: 'test', price: 10, status: 'seen' }

describe('PATCH /api/deals/[id]', () => {
  beforeEach(() => jest.clearAllMocks())

  it('met à jour le status', async () => {
    mockPrisma.deal.update.mockResolvedValue({ ...MOCK_DEAL, status: 'seen' })
    const req = new NextRequest('http://localhost:3001/api/deals/deal-1', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'seen' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await PATCH(req, makeParams('deal-1'))
    expect(res.status).toBe(200)
    expect(mockPrisma.deal.update).toHaveBeenCalledWith({
      where: { id: 'deal-1' },
      data: { status: 'seen' },
    })
  })

  it('met à jour vers dismissed', async () => {
    mockPrisma.deal.update.mockResolvedValue({ ...MOCK_DEAL, status: 'dismissed' })
    const req = new NextRequest('http://localhost:3001/api/deals/deal-1', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'dismissed' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await PATCH(req, makeParams('deal-1'))
    const data = await res.json()
    expect(data.status).toBe('dismissed')
  })
})

describe('DELETE /api/deals/[id]', () => {
  beforeEach(() => jest.clearAllMocks())

  it('supprime le deal et retourne ok', async () => {
    mockPrisma.deal.delete.mockResolvedValue(MOCK_DEAL)
    const req = new NextRequest('http://localhost:3001/api/deals/deal-1', { method: 'DELETE' })
    const res = await DELETE(req, makeParams('deal-1'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.ok).toBe(true)
    expect(mockPrisma.deal.delete).toHaveBeenCalledWith({ where: { id: 'deal-1' } })
  })
})
