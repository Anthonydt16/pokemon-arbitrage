'use client'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import SearchForm, { SearchFormData } from '@/components/SearchForm'
import { authHeaders, getToken } from '@/lib/client-auth'

export default function NewSearchPage() {
  const router = useRouter()

  useEffect(() => {
    if (!getToken()) router.replace('/login')
  }, [router])

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
      router.push('/login')
      return
    }
    router.push('/searches')
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Nouvelle recherche</h1>
        <p className="text-gray-400 text-sm mt-1">Configurez une nouvelle alerte de scraping</p>
      </div>
      <SearchForm onSubmit={handleSubmit} submitLabel="Créer la recherche" />
    </div>
  )
}
