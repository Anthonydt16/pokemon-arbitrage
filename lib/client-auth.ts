export const AUTH_TOKEN_KEY = 'pokarbitrage_token'
export const AUTH_EMAIL_KEY = 'pokarbitrage_email'

export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(AUTH_TOKEN_KEY)
}

export function getEmail(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(AUTH_EMAIL_KEY)
}

export function setAuth(token: string, email: string) {
  if (typeof window === 'undefined') return
  localStorage.setItem(AUTH_TOKEN_KEY, token)
  localStorage.setItem(AUTH_EMAIL_KEY, email)
}

export function clearAuth() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(AUTH_TOKEN_KEY)
  localStorage.removeItem(AUTH_EMAIL_KEY)
}

export function authHeaders(extra?: HeadersInit): HeadersInit {
  const token = getToken()
  return {
    ...(extra || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}
