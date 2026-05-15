'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import SearchForm, { SearchFormData } from '@/components/SearchForm'
import { authHeaders, getToken } from '@/lib/client-auth'
import { useI18n } from '@/lib/i18n'

export default function NewSearchPage() {
  const router = useRouter()
  const { locale, t } = useI18n()

  useEffect(() => {
    if (!getToken()) router.replace(`/${locale}`)
  }, [router, locale])

  const handleSubmit = async (data: SearchFormData) => {
    const res = await fetch('/api/searches', {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        ...data,
        minPrice: parseFloat(data.minPrice),
        maxPrice: parseFloat(data.maxPrice),
      }),
    })

    if (res.status === 401) {
      router.push(`/${locale}`)
      return
    }

    router.push(`/${locale}/searches`)
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">{t('searches.newSearch')}</h1>
        <p className="text-gray-400 text-sm mt-1">{t('searches.title')}</p>
      </div>
      <SearchForm onSubmit={handleSubmit} submitLabel={t('searches.create')} />
    </div>
  )
}
