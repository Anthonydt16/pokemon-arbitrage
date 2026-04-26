'use client'
import { useRouter } from 'next/navigation'
import SearchForm, { SearchFormData } from '@/components/SearchForm'

export default function NewSearchPage() {
  const router = useRouter()

  const handleSubmit = async (data: SearchFormData) => {
    await fetch('/api/searches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...data,
        minPrice: parseFloat(data.minPrice),
        maxPrice: parseFloat(data.maxPrice),
      }),
    })
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
