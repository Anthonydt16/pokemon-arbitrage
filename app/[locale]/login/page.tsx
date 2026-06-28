'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useI18n } from '@/lib/i18n'
import { FormEvent, useState } from 'react'
import { setAuth } from '@/lib/client-auth'

export default function LoginPage() {
  const router = useRouter()
  const { locale, t } = useI18n()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error || t('auth.noAccount'))
      return
    }

    setAuth(data.token, data.email)
    router.push(`/${locale}/searches`)
  }

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-bold text-white mb-2">{t('auth.login')}</h1>
      <p className="text-gray-400 text-sm mb-6">{t('auth.haveAccount')}</p>

      <form onSubmit={onSubmit} className="space-y-4 bg-gray-900 border border-gray-800 rounded-xl p-6">
        {error && <div className="text-sm text-red-400 bg-red-900/30 border border-red-700 rounded-lg px-3 py-2">{error}</div>}

        <div>
          <label className="block text-sm text-gray-300 mb-1">{t('auth.email')}</label>
          <input
            type="email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-300 mb-1">{t('auth.password')}</label>
          <input
            type="password"
            required
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-semibold py-2.5 rounded-lg disabled:opacity-60"
        >
          {loading ? `${t('messages.loading')}...` : t('auth.signIn')}
        </button>
      </form>

      <p className="text-sm text-gray-400 mt-4 text-center">
        {t('auth.noAccount')}{' '}
        <Link href={`/${locale}/register`} className="text-yellow-400 hover:underline">{t('auth.signUp')}</Link>
      </p>
    </div>
  )
}
