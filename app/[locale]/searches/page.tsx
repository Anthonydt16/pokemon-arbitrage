'use client'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useI18n } from '@/lib/i18n'
import { authHeaders, getToken } from '@/lib/client-auth'
import SearchForm, { SearchFormData } from '@/components/SearchForm'

type SearchItem = {
  id: string
  name: string
  keywords: string[]
  platforms: string[]
  minPrice: number
  maxPrice: number
  active: boolean
  isGlobal: boolean
  readonly?: boolean
  _count?: { deals: number }
}

export default function SearchesPage() {
  const { t, locale } = useI18n()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [items, setItems] = useState<SearchItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null)
  const [editingItem, setEditingItem] = useState<SearchItem | null>(null)
  const [localSuccessMessage, setLocalSuccessMessage] = useState('')

  const loadSearches = async () => {
    setError('')
    try {
      const res = await fetch('/api/searches', { headers: authHeaders() })
      if (!res.ok) {
        throw new Error('Failed to load searches')
      }
      const data = await res.json()
      setItems(Array.isArray(data) ? data : [])
    } catch (e) {
      setError(t('messages.error'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!getToken()) {
      setLoading(false)
      router.replace(`/${locale}`)
      return
    }
    loadSearches()
  }, [pathname, searchParams.toString(), locale, router])

  const toggleActive = async (item: SearchItem) => {
    if (item.readonly || item.isGlobal) return
    const res = await fetch(`/api/searches/${item.id}`, {
      method: 'PATCH',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ active: !item.active }),
    })
    if (res.ok) {
      setItems(prev => prev.map(s => (s.id === item.id ? { ...s, active: !s.active } : s)))
    }
  }

  const removeSearch = async (item: SearchItem) => {
    if (item.readonly || item.isGlobal) return
    const res = await fetch(`/api/searches/${item.id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    })
    if (res.ok) {
      setItems(prev => prev.filter(s => s.id !== item.id))
    }
  }

  const openCreateModal = () => {
    if (!getToken()) {
      router.push(`/${locale}/login`)
      return
    }
    setEditingItem(null)
    setModalMode('create')
  }

  const openEditModal = (item: SearchItem) => {
    if (item.readonly || item.isGlobal) return
    if (!getToken()) {
      router.push(`/${locale}/login`)
      return
    }
    setEditingItem(item)
    setModalMode('edit')
  }

  const closeModal = () => {
    setModalMode(null)
    setEditingItem(null)
  }

  const handleCreateSubmit = async (data: SearchFormData) => {
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
      router.push(`/${locale}/login`)
      return
    }

    if (!res.ok) {
      throw new Error('Failed to create search')
    }

    await loadSearches()
    closeModal()
    setLocalSuccessMessage(t('searches.create'))
  }

  const handleEditSubmit = async (data: SearchFormData) => {
    if (!editingItem) return

    const res = await fetch(`/api/searches/${editingItem.id}`, {
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

    if (!res.ok) {
      throw new Error('Failed to update search')
    }

    await loadSearches()
    closeModal()
    setLocalSuccessMessage(t('searches.update'))
  }

  if (loading) {
    return <div className="text-gray-400">{t('messages.loading')}</div>
  }

  if (!getToken()) return null

  const status = searchParams.get('status')
  const successMessage = localSuccessMessage || (status === 'created'
    ? t('searches.create')
    : status === 'updated'
      ? t('searches.update')
      : '')

  const globalSearches = items.filter(item => item.isGlobal || item.readonly)
  const personalSearches = items.filter(item => !item.isGlobal && !item.readonly)

  const renderSearchCard = (item: SearchItem, muted = false) => (
    <div
      key={item.id}
      className={`rounded-xl p-5 border ${muted ? 'bg-gray-950/40 border-gray-900 opacity-80' : 'bg-gray-900 border-gray-800'}`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h2 className={`font-semibold ${muted ? 'text-gray-200 text-base' : 'text-white text-lg'}`}>{item.name}</h2>
          <p className="text-xs text-gray-500 mt-1">
            {item.isGlobal ? t('searches.isGlobal') : t('searches.personalLabel')} · {item._count?.deals ?? 0} deals
          </p>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full ${item.active ? 'bg-green-500/20 text-green-400' : 'bg-gray-700 text-gray-300'}`}>
          {item.active ? t('searches.statusActive') : t('searches.statusInactive')}
        </span>
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        {item.keywords?.map(kw => (
          <span key={kw} className="bg-yellow-500/20 text-yellow-400 text-xs px-2 py-0.5 rounded-full">{kw}</span>
        ))}
      </div>

      <div className="text-sm text-gray-400 mb-4">
        <span>{item.platforms?.join(', ')}</span>
        <span className="mx-2">•</span>
        <span>{item.minPrice}€ - {item.maxPrice}€</span>
      </div>

      {!item.readonly && !item.isGlobal && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => openEditModal(item)}
            className="bg-gray-800 hover:bg-gray-700 text-gray-200 text-sm px-3 py-2 rounded-lg"
          >
            {t('searches.editSearch')}
          </button>
          <button
            onClick={() => toggleActive(item)}
            className="bg-gray-800 hover:bg-gray-700 text-gray-200 text-sm px-3 py-2 rounded-lg"
          >
            {item.active ? t('deals.archive') : t('deals.restore')}
          </button>
          <button
            onClick={() => removeSearch(item)}
            className="bg-red-900/50 hover:bg-red-900 text-red-300 text-sm px-3 py-2 rounded-lg"
          >
            {t('searches.delete')}
          </button>
        </div>
      )}
    </div>
  )

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-6">
        <h1 className="text-3xl font-bold text-white">{t('searches.title')}</h1>
        <button
          type="button"
          onClick={openCreateModal}
          className="bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-semibold px-4 py-2 rounded-lg"
        >
          + {t('searches.newSearch')}
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-red-900/40 border border-red-700 text-red-300 text-sm px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {!!successMessage && (
        <div className="mb-4 bg-green-900/40 border border-green-700 text-green-300 text-sm px-4 py-3 rounded-lg">
          {successMessage} {t('messages.success').toLowerCase()}
        </div>
      )}

      {items.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-gray-400">
          {t('searches.noSearches')}
        </div>
      ) : (
        <div className="space-y-8">
          <section>
            <div className="mb-3">
              <h2 className="text-xl font-bold text-white">{t('searches.personalSectionTitle')}</h2>
              <p className="text-sm text-gray-500">{t('searches.personalSectionHint')}</p>
            </div>
            {personalSearches.length === 0 ? (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-gray-500 text-sm">
                {t('searches.noSearches')}
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {personalSearches.map(item => renderSearchCard(item, false))}
              </div>
            )}
          </section>

          <section className="pt-2 border-t border-gray-800/70">
            <div className="mb-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">{t('searches.globalSectionTitle')}</h2>
              <p className="text-xs text-gray-600">{t('searches.globalSectionHint')}</p>
            </div>
            {globalSearches.length === 0 ? (
              <div className="bg-gray-950/40 border border-gray-900 rounded-xl p-4 text-gray-600 text-sm">
                {t('searches.noSearches')}
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {globalSearches.map(item => renderSearchCard(item, true))}
              </div>
            )}
          </section>
        </div>
      )}

      {modalMode && (
        <div
          className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm p-4 sm:p-8 overflow-y-auto"
          onClick={closeModal}
        >
          <div
            className="max-w-3xl mx-auto bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-white">
                {modalMode === 'create' ? t('searches.newSearch') : t('searches.editSearch')}
              </h2>
              <button
                type="button"
                onClick={closeModal}
                className="text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg px-3 py-2 text-sm"
              >
                Fermer
              </button>
            </div>

            {modalMode === 'create' ? (
              <SearchForm onSubmit={handleCreateSubmit} submitLabel={t('searches.create')} />
            ) : editingItem ? (
              <SearchForm
                initialData={{
                  name: editingItem.name,
                  keywords: editingItem.keywords,
                  platforms: editingItem.platforms,
                  minPrice: String(editingItem.minPrice ?? 0),
                  maxPrice: String(editingItem.maxPrice),
                  active: editingItem.active,
                }}
                onSubmit={handleEditSubmit}
                submitLabel={t('searches.update')}
              />
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}
