'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import SearchForm, { SearchFormData } from '@/components/SearchForm'
import { authHeaders, getToken } from '@/lib/client-auth'

export default function EditSearchPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const [initial, setInitial] = useState<SearchFormData | null>(null)

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login')
      return
    }

    fetch(`/api/searches/${id}`, { headers: authHeaders() })
      .then(async r => {
        if (r.status === 401 || r.status === 403) {
          router.replace('/searches')
          return null
        }
        return r.json()
      })
      .then(data => data && setInitial({
        name: data.name,
        keywords: data.keywords,
        platforms: data.platforms,
        minPrice: String(data.minPrice ?? 0),
        maxPrice: String(data.maxPrice),
        active: data.active,
      }))
  }, [id, router])

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
      router.push('/searches')
      return
    }
    router.push('/searches')
  }

  if (!initial) return <div className="text-gray-500 text-center py-20">Chargement...</div>

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Modifier la recherche</h1>
        <p className="text-gray-400 text-sm mt-1">{initial.name}</p>
      </div>
      <SearchForm initialData={initial} onSubmit={handleSubmit} submitLabel="Enregistrer" />
    </div>
  )
}
