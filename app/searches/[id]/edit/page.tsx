'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import SearchForm, { SearchFormData } from '@/components/SearchForm'

export default function EditSearchPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const [initial, setInitial] = useState<SearchFormData | null>(null)

  useEffect(() => {
    fetch(`/api/searches/${id}`)
      .then(r => r.json())
      .then(data => setInitial({
        name: data.name,
        keywords: data.keywords,
        platforms: data.platforms,
        minPrice: String(data.minPrice ?? 0),
        maxPrice: String(data.maxPrice),
        active: data.active,
      }))
  }, [id])

  const handleSubmit = async (data: SearchFormData) => {
    await fetch(`/api/searches/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...data,
        minPrice: parseFloat(data.minPrice),
        maxPrice: parseFloat(data.maxPrice),
      }),
    })
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
