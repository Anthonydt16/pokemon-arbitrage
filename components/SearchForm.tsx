'use client'
import { useState, KeyboardEvent } from 'react'
import { useRouter } from 'next/navigation'

export type SearchFormData = {
  name: string
  keywords: string[]
  platforms: string[]
  minPrice: string
  maxPrice: string
  active: boolean
}

type Props = {
  initialData?: SearchFormData
  onSubmit: (data: SearchFormData) => Promise<void>
  submitLabel: string
}

const PLATFORMS = [
  { id: 'leboncoin', label: 'Leboncoin', color: 'bg-orange-500' },
  { id: 'vinted', label: 'Vinted', color: 'bg-teal-500' },
  { id: 'ebay', label: 'eBay', color: 'bg-blue-500' },
]

export default function SearchForm({ initialData, onSubmit, submitLabel }: Props) {
  const router = useRouter()
  const [form, setForm] = useState<SearchFormData>(initialData || {
    name: '',
    keywords: [],
    platforms: ['leboncoin', 'vinted'],
    minPrice: '0',
    maxPrice: '100',
    active: true,
  })
  const [keywordInput, setKeywordInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const normalizeKeyword = (value: string) => value.trim().toLowerCase()

  const appendKeywords = (values: string[]) => {
    const normalized = values.map(normalizeKeyword).filter(Boolean)
    if (normalized.length === 0) return

    setForm(prev => {
      const merged = [...prev.keywords]
      for (const kw of normalized) {
        if (!merged.includes(kw)) merged.push(kw)
      }
      return { ...prev, keywords: merged }
    })
  }

  const addKeyword = () => {
    appendKeywords([keywordInput])
    setKeywordInput('')
  }

  const onKeywordChange = (value: string) => {
    if (!value.includes(',')) {
      setKeywordInput(value)
      return
    }

    const parts = value.split(',')
    const completed = parts.slice(0, -1)
    const draft = parts[parts.length - 1] || ''

    appendKeywords(completed)
    setKeywordInput(draft.trimStart())
  }

  const onKeywordKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); addKeyword() }
    if (e.key === 'Backspace' && !keywordInput && form.keywords.length > 0) {
      setForm(prev => ({ ...prev, keywords: prev.keywords.slice(0, -1) }))
    }
  }

  const removeKeyword = (kw: string) => {
    setForm(prev => ({ ...prev, keywords: prev.keywords.filter(k => k !== kw) }))
  }

  const togglePlatform = (p: string) => {
    setForm(prev => ({
      ...prev,
      platforms: prev.platforms.includes(p)
        ? prev.platforms.filter(pl => pl !== p)
        : [...prev.platforms, p],
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!form.name) { setError('Le nom est requis.'); return }
    if (form.keywords.length === 0) { setError('Ajoute au moins un mot-clé.'); return }
    if (form.platforms.length === 0) { setError('Sélectionne au moins une plateforme.'); return }
    if (parseFloat(form.minPrice) >= parseFloat(form.maxPrice)) {
      setError('Le prix minimum doit être inférieur au prix maximum.')
      return
    }
    setSaving(true)
    await onSubmit(form)
    setSaving(false)
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xl space-y-6">

      {error && (
        <div className="bg-red-900/40 border border-red-700 text-red-300 text-sm px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Nom */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Nom de la recherche</label>
        <input
          type="text"
          value={form.name}
          onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
          placeholder="ex: Dracaufeu vintage"
          required
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500 transition-colors"
        />
      </div>

      {/* Mots-clés */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Mots-clés <span className="text-gray-500 font-normal">(virgule ou Entrée pour valider)</span>
        </label>
        <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 focus-within:border-yellow-500 transition-colors min-h-[44px]">
          <input
            type="text"
            value={keywordInput}
            onChange={e => onKeywordChange(e.target.value)}
            onKeyDown={onKeywordKeyDown}
            onBlur={addKeyword}
            placeholder="dracaufeu, lot pokemon..."
            data-testid="keyword-input"
            className="w-full min-w-[120px] bg-transparent text-white placeholder-gray-500 focus:outline-none text-sm py-0.5"
          />
        </div>
        {form.keywords.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {form.keywords.map(kw => (
              <span key={kw} className="inline-flex items-center gap-2 bg-yellow-500/20 text-yellow-400 text-sm px-3 py-1 rounded-full border border-yellow-500/30">
                <span>{kw}</span>
                <button
                  type="button"
                  onClick={() => removeKeyword(kw)}
                  className="text-yellow-300 hover:text-yellow-100 leading-none cursor-pointer"
                  aria-label={`Supprimer ${kw}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Plateformes */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Plateformes</label>
        <div className="flex gap-3 flex-wrap">
          {PLATFORMS.map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => togglePlatform(p.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                form.platforms.includes(p.id)
                  ? 'bg-yellow-500 text-gray-900 border-yellow-500 scale-105'
                  : 'bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-600'
              }`}
            >
              {form.platforms.includes(p.id) ? '✓ ' : ''}{p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Fourchette de prix */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Fourchette de prix</label>
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <input
              type="number"
              value={form.minPrice}
              onChange={e => setForm(prev => ({ ...prev, minPrice: e.target.value }))}
              min="0"
              placeholder="Min"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-yellow-500 transition-colors pr-8"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">€</span>
          </div>
          <span className="text-gray-500">→</span>
          <div className="relative flex-1">
            <input
              type="number"
              value={form.maxPrice}
              onChange={e => setForm(prev => ({ ...prev, maxPrice: e.target.value }))}
              min="1"
              placeholder="Max"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-yellow-500 transition-colors pr-8"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">€</span>
          </div>
        </div>
        <p className="text-xs text-gray-600 mt-1">Filtrer les annonces dans cette fourchette de prix</p>
      </div>

      {/* Active */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setForm(prev => ({ ...prev, active: !prev.active }))}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.active ? 'bg-green-500' : 'bg-gray-700'}`}
        >
          <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${form.active ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
        <span className="text-sm text-gray-300">Recherche active</span>
      </div>

      {/* Boutons */}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-gray-900 font-semibold px-6 py-2.5 rounded-lg transition-colors"
        >
          {saving ? 'Enregistrement...' : submitLabel}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-6 py-2.5 rounded-lg transition-colors"
        >
          Annuler
        </button>
      </div>
    </form>
  )
}
