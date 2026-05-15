'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import SearchForm, { SearchFormData } from '@/components/SearchForm'
import { authHeaders, getToken } from '@/lib/client-auth'
import { useI18n } from '@/lib/i18n'

export default function EditSearchModal() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = params.id
  const { locale, t } = useI18n()
  const [initial, setInitial] = useState<SearchFormData | null>(null)

  useEffect(() => {
    if (!getToken()) {
      router.replace(`/${locale}`)
      return
    }

    fetch(`/api/searches/${id}`, { headers: authHeaders() })
      .then(async r => {
        if (r.status === 401 || r.status === 403) {
          router.replace(`/${locale}/searches`)
          return null
        }
        return r.json()
      })
      .then(data =>
        data &&
        setInitial({
          name: data.name,
          keywords: data.keywords,
          platforms: data.platforms,
          minPrice: String(data.minPrice ?? 0),
          maxPrice: String(data.maxPrice),
          active: data.active,
        })
      )
  }, [id, locale, router])

  const handleSubmit = async (data: SearchFormData) => {
    const res = await fetch(`/api/searches/${id}`, {
      method: 'PATCH',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        ...data,
        minPrice: parseFloat(data.minPrice),
        maxPrice: parseFloat(data.maxPrice),
      }),
    })

    if (res.status === 401 || res.status === 403) {
      router.push(`/${locale}/searches`)
      return
    }

    router.replace(`/${locale}/searches?status=updated`)
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
          <h2 className="text-xl font-bold text-white">{t('searches.editSearch')}</h2>
          <button
            onClick={() => router.back()}
            className="text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg px-3 py-2 text-sm"
          >
            Fermer
          </button>
        </div>

        {!initial ? (
          <div className="text-gray-400 py-10 text-center">{t('messages.loading')}</div>
        ) : (
          <SearchForm initialData={initial} onSubmit={handleSubmit} submitLabel={t('searches.update')} />
        )}
      </div>
    </div>
  )
}
