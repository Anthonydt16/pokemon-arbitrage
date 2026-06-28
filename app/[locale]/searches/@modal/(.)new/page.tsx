'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import SearchForm, { SearchFormData } from '@/components/SearchForm'
import { authHeaders, getToken } from '@/lib/client-auth'
import { useI18n } from '@/lib/i18n'

export default function NewSearchModal() {
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

    router.replace(`/${locale}/searches?status=created`)
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm p-4 sm:p-8 overflow-y-auto"
      onClick={() => router.back()}
    >
      <div
        className="max-w-3xl mx-auto bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-white">{t('searches.newSearch')}</h2>
          <button
            onClick={() => router.back()}
            className="text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg px-3 py-2 text-sm"
          >
            Fermer
          </button>
        </div>
        <SearchForm onSubmit={handleSubmit} submitLabel={t('searches.create')} />
      </div>
    </div>
  )
}
