'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type Search = {
  id: string
  name: string
  keywords: string[]
  platforms: string[]
  minPrice: number
  maxPrice: number
  active: boolean
  lastAvgPrice?: number
  lastScrapeAt?: string
  _count?: { deals: number }
}

export default function SearchesPage() {
  const [searches, setSearches] = useState<Search[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetch('/api/searches')
      .then(r => r.json())
      .then(data => { setSearches(data); setLoading(false) })
  }, [])

  const toggleActive = async (search: Search) => {
    await fetch(`/api/searches/${search.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !search.active }),
    })
    setSearches(prev => prev.map(s => s.id === search.id ? { ...s, active: !s.active } : s))
  }

  const deleteSearch = async (id: string) => {
    if (!confirm('Supprimer cette recherche et tous ses deals ?')) return
    await fetch(`/api/searches/${id}`, { method: 'DELETE' })
    setSearches(prev => prev.filter(s => s.id !== id))
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Mes Recherches</h1>
          <p className="text-gray-400 text-sm mt-1">Gérez vos alertes de scraping</p>
        </div>
        <Link
          href="/searches/new"
          className="bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          + Nouvelle recherche
        </Link>
      </div>

      {loading ? (
        <div className="text-gray-500 text-center py-20">Chargement...</div>
      ) : searches.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">🔍</div>
          <div className="text-gray-400">Aucune recherche configurée</div>
          <Link href="/searches/new" className="text-yellow-400 hover:underline text-sm mt-2 block">
            Créer votre première recherche →
          </Link>
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left text-gray-400 text-sm font-medium px-6 py-4">Nom</th>
                <th className="text-left text-gray-400 text-sm font-medium px-4 py-4">Mots-clés</th>
                <th className="text-left text-gray-400 text-sm font-medium px-4 py-4">Plateformes</th>
                <th className="text-left text-gray-400 text-sm font-medium px-4 py-4">Fourchette</th>
                <th className="text-left text-gray-400 text-sm font-medium px-4 py-4">Deals</th>
                <th className="text-left text-gray-400 text-sm font-medium px-4 py-4">Actif</th>
                    <th className="text-left text-gray-400 text-sm font-medium px-4 py-4">Moy. marché</th>
              <th className="text-left text-gray-400 text-sm font-medium px-4 py-4">Dernier scan</th>
              <th className="text-right text-gray-400 text-sm font-medium px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {searches.map((search, i) => (
                <tr key={search.id} className={`border-b border-gray-800 last:border-0 ${i % 2 === 0 ? '' : 'bg-gray-900/50'}`}>
                  <td className="px-6 py-4 font-medium text-white">{search.name}</td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-1">
                      {search.keywords.map(k => (
                        <span key={k} className="text-xs bg-gray-800 text-gray-300 px-2 py-0.5 rounded-full">{k}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex gap-1">
                      {search.platforms.map(p => (
                        <span key={p} className="text-xs bg-gray-700 text-gray-200 px-2 py-0.5 rounded-full capitalize">{p}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-yellow-400 font-medium">{search.minPrice ?? 0}€ → {search.maxPrice}€</td>
                  <td className="px-4 py-4 text-gray-300">{search._count?.deals ?? 0}</td>
                  <td className="px-4 py-4">
                    {search.lastAvgPrice
                      ? <span className="text-green-400 font-medium">{search.lastAvgPrice.toFixed(2)}€</span>
                      : <span className="text-gray-600">—</span>}
                  </td>
                  <td className="px-4 py-4 text-gray-500 text-xs">
                    {search.lastScrapeAt
                      ? new Date(search.lastScrapeAt).toLocaleString('fr-FR', {day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})
                      : 'Jamais'}
                  </td>
                  <td className="px-4 py-4">
                    <button
                      onClick={() => toggleActive(search)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${search.active ? 'bg-green-500' : 'bg-gray-700'}`}
                    >
                      <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${search.active ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => router.push(`/searches/${search.id}/edit`)}
                        className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        ✏️ Modifier
                      </button>
                      <button
                        onClick={() => deleteSearch(search.id)}
                        className="text-xs bg-gray-800 hover:bg-red-900 text-red-400 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        Supprimer
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
