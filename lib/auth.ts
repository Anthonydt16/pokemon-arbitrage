import jwt from 'jsonwebtoken'
import { NextRequest } from 'next/server'

const JWT_SECRET = process.env.JWT_SECRET || 'pokarbitrage-secret-dev-2026'

export interface JWTPayload {
  userId: string
  email: string
}

export function signToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload
  } catch {
    return null
  }
}

export function getAuthUser(req: NextRequest): JWTPayload | null {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return null
  const token = authHeader.slice(7)
  return verifyToken(token)
}
