'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useI18n } from '@/lib/i18n'
import { FormEvent, useState } from 'react'
import { setAuth } from '@/lib/client-auth'

function getPasswordStrength(password: string) {
  if (!password) {
    return {
      score: 0,
      levelKey: 'auth.passwordStrengthEmpty',
      barClass: 'bg-gray-700',
      widthClass: 'w-0',
    }
  }

  let score = 0
  if (password.length >= 8) score += 1
  if (/[A-Za-z]/.test(password) && /\d/.test(password)) score += 1
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1
  if (/[^A-Za-z\d]/.test(password)) score += 1

  if (score <= 1) {
    return {
      score,
      levelKey: 'auth.passwordStrengthWeak',
      barClass: 'bg-red-500',
      widthClass: 'w-1/4',
    }
  }

  if (score <= 2) {
    return {
      score,
      levelKey: 'auth.passwordStrengthMedium',
      barClass: 'bg-yellow-500',
      widthClass: 'w-2/4',
    }
  }

  if (score === 3) {
    return {
      score,
      levelKey: 'auth.passwordStrengthGood',
      barClass: 'bg-blue-500',
      widthClass: 'w-3/4',
    }
  }

  return {
    score,
    levelKey: 'auth.passwordStrengthStrong',
    barClass: 'bg-green-500',
    widthClass: 'w-full',
  }
}

export default function RegisterPage() {
  const router = useRouter()
  const { locale, t } = useI18n()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const passwordRule = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/
  const passwordStrength = getPasswordStrength(password)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (!passwordRule.test(password)) {
      setError(t('auth.passwordRule'))
      return
    }
    if (password !== confirmPassword) {
      setError(t('auth.passwordMismatch'))
      return
    }

    setLoading(true)

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error || t('messages.error'))
      return
    }

    setAuth(data.token, data.email)
    router.push(`/${locale}/searches`)
  }

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-bold text-white mb-2">{t('auth.register')}</h1>
      <p className="text-gray-400 text-sm mb-6">{t('home.signUp')}</p>

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
            minLength={8}
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
          />
          <div className="mt-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-400">{t('auth.passwordStrengthLabel')}</span>
              <span className="text-xs text-gray-400">{t(passwordStrength.levelKey)}</span>
            </div>
            <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden border border-gray-700">
              <div className={`h-full ${passwordStrength.barClass} ${passwordStrength.widthClass} transition-all duration-200`} />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-1">{t('auth.passwordRule')}</p>
        </div>

        <div>
          <label className="block text-sm text-gray-300 mb-1">{t('auth.passwordConfirm')}</label>
          <input
            type="password"
            required
            minLength={8}
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-semibold py-2.5 rounded-lg disabled:opacity-60"
        >
          {loading ? `${t('messages.loading')}...` : t('auth.signUp')}
        </button>
      </form>

      <p className="text-sm text-gray-400 mt-4 text-center">
        {t('auth.haveAccount')}{' '}
        <Link href={`/${locale}/login`} className="text-yellow-400 hover:underline">{t('auth.signIn')}</Link>
      </p>
    </div>
  )
}
