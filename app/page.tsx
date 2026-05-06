'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { authHeaders, getToken } from '@/lib/client-auth'

type Deal = {
  id: string
  title: string
  price: number
  url: string
  platform: string
  imageUrl?: string
  cardMarketPrice?: number
  margin?: number
  location?: string
  status: string
  foundAt: string
  search?: { name: string; isGlobal?: boolean }
  trustLevel?: string
  trustFlags?: string
}

function proxyImage(url?: string) {
  if (!url) return undefined
  return `/api/proxy-image?url=${encodeURIComponent(url)}`
}

type BestToday = {
  deal: Deal | null
  scope: 'today' | 'week'
}

type Stats = {
  total: number
  todayCount: number
  bestMargin: number | null
  activeSearches: number
}

const PLATFORM_COLORS: Record<string, string> = {
  leboncoin: 'bg-orange-500',
  vinted: 'bg-teal-500',
  ebay: 'bg-blue-500',
}
const PLATFORM_EMOJI: Record<string, string> = {
  leboncoin: '🟠', vinted: '🟢', ebay: '🔵',
}

const TRUST_CONFIG: Record<string, { label: string; className: string }> = {
  safe: { label: 'Fiable', className: 'bg-green-500/20 text-green-400 border border-green-500/40' },
  check: { label: 'À vérifier', className: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40' },
  suspect: { label: 'Suspect', className: 'bg-red-500/20 text-red-400 border border-red-500/40' },
}
const TRUST_EMOJI: Record<string, string> = { safe: '🟢', check: '🟡', suspect: '🔴' }

function DealCard({ deal, onStatus, onDelete, blurred }: {
  deal: Deal
  onStatus?: (id: string, s: string) => void
  onDelete?: (id: string) => void
  blurred?: boolean
}) {
  const trust = deal.trustLevel ? TRUST_CONFIG[deal.trustLevel] : null
  const trustEmoji = deal.trustLevel ? TRUST_EMOJI[deal.trustLevel] : null
  const flags: string[] = deal.trustFlags ? (() => { try { return JSON.parse(deal.trustFlags!) } catch { return [] } })() : []

  return (
    <div className={`bg-gray-900 border border-gray-800 rounded-xl overflow-hidden hover:border-gray-700 transition-all relative ${blurred ? 'select-none' : ''}`}>
      {blurred && (
        <div className="absolute inset-0 z-10 backdrop-blur-sm bg-gray-950/60 flex flex-col items-center justify-center rounded-xl gap-3">
          <span className="text-2xl">🔒</span>
          <p className="text-sm text-gray-300 font-medium text-center px-4">Inscrivez-vous pour voir ce deal</p>
          <Link href="/register" className="bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-bold text-xs px-4 py-2 rounded-lg transition-colors">
            S&apos;inscrire gratuitement
          </Link>
        </div>
      )}
      {deal.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={proxyImage(deal.imageUrl)} alt={deal.title} className="w-full h-36 object-cover" />
      )}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium text-white ${PLATFORM_COLORS[deal.platform] || 'bg-gray-700'}`}>
            {PLATFORM_EMOJI[deal.platform]} {deal.platform}
          </span>
          <div className="flex items-center gap-2">
            {deal.margin != null && (
              <span className={`text-sm font-bold ${deal.margin >= 35 ? 'text-green-400' : 'text-yellow-400'}`}>
                -{deal.margin.toFixed(0)}% / marché
              </span>
            )}
            {trust && (
              <div className="relative group flex-shrink-0">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium cursor-default whitespace-nowrap inline-flex items-center gap-1 ${trust.className}`}>
                  <span>{trustEmoji}</span><span>{trust.label}</span>
                </span>
                {flags.length > 0 && (
                  <div className="absolute right-0 top-6 z-10 hidden group-hover:block bg-gray-800 border border-gray-700 rounded-lg p-2 min-w-max shadow-lg">
                    <div className="text-xs text-gray-400 font-medium mb-1">Signalements :</div>
                    {flags.map((f, i) => (
                      <div key={i} className="text-xs text-red-400">⚠️ {f.replace(/_/g, ' ')}</div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        <h3 className="font-medium text-white text-sm leading-tight mb-2 line-clamp-2">{deal.title}</h3>
        <div className="flex items-center justify-between mb-1">
          <span className="text-2xl font-bold text-yellow-400">{deal.price}€</span>
          {deal.cardMarketPrice && (
            <span className="text-xs text-gray-500">méd. {deal.cardMarketPrice}€</span>
          )}
        </div>
        {deal.search && (
          <div className="text-xs text-gray-600 mb-1">
            {deal.search.isGlobal ? '🗓 ' : '📋 '}{deal.search.name}
          </div>
        )}
        {deal.location && <div className="text-xs text-gray-500 mb-2">📍 {deal.location}</div>}
        {!blurred && (
          <div className="flex gap-2 mt-3">
            <a href={deal.url} target="_blank" rel="noopener noreferrer"
              className="flex-1 text-center text-xs bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-semibold py-2 rounded-lg transition-colors">
              Voir l&apos;annonce →
            </a>
            {onStatus && deal.status === 'new' && (<>
              <button onClick={() => onStatus(deal.id, 'seen')} className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-2 rounded-lg" title="Vu">👁</button>
              <button onClick={() => onStatus(deal.id, 'dismissed')} className="text-xs bg-gray-800 hover:bg-red-900 text-gray-300 px-3 py-2 rounded-lg" title="Ignorer">🗑</button>
            </>)}
            {onDelete && deal.status !== 'new' && (
              <button onClick={() => onDelete(deal.id)} className="text-xs bg-gray-800 hover:bg-red-900 text-gray-300 px-3 py-2 rounded-lg">✕</button>
            )}
          </div>
        )}
        <div className="text-xs text-gray-700 mt-2">
          {new Date(deal.foundAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// LANDING PAGE (visiteurs non connectés)
// ─────────────────────────────────────────────
function LandingPage() {
  const [topDeals, setTopDeals] = useState<Deal[]>([])
  const [loadingDeals, setLoadingDeals] = useState(true)

  useEffect(() => {
    fetch('/api/deals/top?limit=10')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.global) setTopDeals(data.global)
      })
      .finally(() => setLoadingDeals(false))
  }, [])

  const visibleDeals = topDeals.slice(0, 5)
  const hiddenDeals = topDeals.slice(5)

  const features = [
    { icon: '🔔', title: 'Alertes en temps réel', desc: "Soyez notifié dès qu'une bonne affaire correspond à vos critères. Ne ratez plus jamais un deal." },
    { icon: '🤖', title: 'Scraping automatique', desc: 'Leboncoin, Vinted, eBay scannés automatiquement 3× par jour pour vous.' },
    { icon: '📊', title: 'Prix marché en temps réel', desc: 'Chaque annonce est comparée aux prix CardMarket pour calculer la marge exacte.' },
    { icon: '🛡️', title: 'Score de confiance', desc: 'Chaque deal est analysé pour détecter les arnaques, lots suspects ou descriptions trompeuses.' },
    { icon: '🎯', title: 'Recherches personnalisées', desc: 'Configurez vos propres alertes : Charizard, ETB, Display… les deals arrivent directement.' },
    { icon: '🌐', title: 'Scans globaux inclus', desc: 'ETB, Display et Boosters scannés pour tous les utilisateurs automatiquement.' },
  ]

  const stats = [
    { value: '3×/jour', label: 'Scans automatiques' },
    { value: '3 plateformes', label: 'Leboncoin · Vinted · eBay' },
    { value: '< 1 min', label: 'Temps de détection' },
    { value: 'Gratuit', label: 'Pour commencer' },
  ]

  return (
    <div className="-mx-4 -mt-8">
      {/* ── Hero ─────────────────────────────────── */}
      <section className="relative overflow-hidden px-4 pt-20 pb-16 text-center">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-0 h-[500px] w-[900px] -translate-x-1/2 rounded-full bg-yellow-500/10 blur-3xl" />
        </div>
        <div className="inline-flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-xs font-medium px-4 py-1.5 rounded-full mb-6">
          🃏 Détection automatique de bonnes affaires Pokémon
        </div>
        <h1 className="text-5xl md:text-6xl font-black text-white leading-tight mb-6 max-w-3xl mx-auto">
          Ne ratez plus jamais un<br />
          <span className="text-yellow-400">deal Pokémon</span>
        </h1>
        <p className="text-gray-400 text-lg max-w-xl mx-auto mb-10 leading-relaxed">
          PokéArbitrage scanne Leboncoin, Vinted et eBay pour vous trouver les cartes et coffrets
          sous le prix du marché — avant tout le monde.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/register"
            className="bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-bold px-8 py-4 rounded-xl text-base transition-colors shadow-lg shadow-yellow-500/20">
            S&apos;inscrire gratuitement →
          </Link>
          <Link href="/login"
            className="bg-gray-800 hover:bg-gray-700 text-white font-medium px-8 py-4 rounded-xl text-base transition-colors border border-gray-700">
            Déjà un compte ? Se connecter
          </Link>
        </div>
        <p className="mt-6 text-xs text-gray-600">✓ Gratuit · ✓ Aucune carte bancaire · ✓ Alertes instantanées</p>
      </section>

      {/* ── Stats bar ─────────────────────────────── */}
      <section className="border-y border-gray-800 bg-gray-900/50 py-8 px-4">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {stats.map(s => (
            <div key={s.label}>
              <div className="text-2xl font-black text-yellow-400">{s.value}</div>
              <div className="text-gray-500 text-sm mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Top 10 du moment ──────────────────────── */}
      <section className="px-4 py-16 max-w-7xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-black text-white mb-3">🔥 Top 10 du moment</h2>
          <p className="text-gray-400">Les meilleures affaires détectées automatiquement — en ce moment même</p>
        </div>
        {loadingDeals ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-4 animate-pulse">
                <div className="h-36 bg-gray-800 rounded-lg mb-4" />
                <div className="h-3 bg-gray-800 rounded w-1/3 mb-3" />
                <div className="h-4 bg-gray-800 rounded w-3/4 mb-2" />
                <div className="h-8 bg-gray-800 rounded" />
              </div>
            ))}
          </div>
        ) : topDeals.length === 0 ? (
          <div className="text-center py-12 bg-gray-900 border border-gray-800 rounded-2xl">
            <div className="text-4xl mb-3">🔍</div>
            <p className="text-gray-400">Prochains deals détectés dans quelques heures</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 mb-4">
              {visibleDeals.map(deal => (
                <DealCard key={deal.id} deal={deal} />
              ))}
            </div>
            {hiddenDeals.length > 0 && (
              <div className="relative">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
                  {hiddenDeals.map(deal => (
                    <DealCard key={deal.id} deal={deal} blurred />
                  ))}
                </div>
                <div className="absolute inset-x-0 bottom-0 h-full bg-gradient-to-t from-gray-950 via-gray-950/80 to-transparent flex flex-col items-center justify-end pb-8">
                  <p className="text-white font-bold text-lg mb-2">+{hiddenDeals.length} deals masqués</p>
                  <p className="text-gray-400 text-sm mb-6 text-center max-w-xs">
                    Inscrivez-vous pour voir tous les deals et recevoir des alertes personnalisées
                  </p>
                  <Link href="/register"
                    className="bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-bold px-8 py-3 rounded-xl text-sm transition-colors shadow-lg shadow-yellow-500/20">
                    Voir tous les deals →
                  </Link>
                </div>
              </div>
            )}
          </>
        )}
      </section>

      {/* ── Features ──────────────────────────────── */}
      <section className="px-4 py-16 bg-gray-900/40 border-y border-gray-800">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-black text-white mb-3">Tout ce qu&apos;il vous faut pour gagner</h2>
            <p className="text-gray-400">Un outil complet pensé pour les collectionneurs et revendeurs Pokémon</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map(f => (
              <div key={f.title} className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-gray-700 transition-colors">
                <div className="text-3xl mb-4">{f.icon}</div>
                <h3 className="text-white font-bold text-base mb-2">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ──────────────────────────── */}
      <section className="px-4 py-16 max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-black text-white mb-3">Comment ça marche ?</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { step: '01', title: 'Créez votre compte', desc: 'Inscrivez-vous en 30 secondes. Aucune carte bancaire requise.' },
            { step: '02', title: 'Configurez vos alertes', desc: "Dites-nous ce que vous cherchez : cartes, coffrets, sets… on s'occupe du reste." },
            { step: '03', title: 'Recevez les deals', desc: 'Le scraper tourne en continu. Dès qu\'un deal correspond, il apparaît dans votre tableau de bord.' },
          ].map(s => (
            <div key={s.step} className="text-center">
              <div className="text-5xl font-black text-yellow-500/20 mb-3">{s.step}</div>
              <h3 className="text-white font-bold text-base mb-2">{s.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────── */}
      <section className="px-4 py-20 text-center">
        <div className="relative max-w-2xl mx-auto bg-gradient-to-br from-yellow-500/10 via-gray-900 to-gray-900 border border-yellow-500/20 rounded-2xl p-12">
          <div className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-yellow-500/10 blur-3xl" />
          </div>
          <div className="text-4xl mb-4">🃏</div>
          <h2 className="text-3xl font-black text-white mb-4">Prêt à ne plus rater un deal ?</h2>
          <p className="text-gray-400 mb-8 max-w-md mx-auto">
            Rejoignez PokéArbitrage et commencez à recevoir des alertes sur les meilleures affaires Pokémon du moment.
          </p>
          <Link href="/register"
            className="inline-block bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-bold px-10 py-4 rounded-xl text-base transition-colors shadow-lg shadow-yellow-500/20">
            Créer mon compte gratuitement →
          </Link>
          <p className="mt-4 text-xs text-gray-600">
            Déjà inscrit ?{' '}
            <Link href="/login" className="text-yellow-500 hover:text-yellow-400 transition-colors">Se connecter</Link>
          </p>
        </div>
      </section>
    </div>
  )
}

// ─────────────────────────────────────────────
// DASHBOARD (utilisateurs connectés)
// ─────────────────────────────────────────────
function Dashboard() {
  const [bestToday, setBestToday] = useState<BestToday | null>(null)
  const [topDeals, setTopDeals] = useState<{ global: Deal[]; personal: Deal[] }>({ global: [], personal: [] })
  const [deals, setDeals] = useState<Deal[]>([])
  const [stats, setStats] = useState<Stats>({ total: 0, todayCount: 0, bestMargin: null, activeSearches: 0 })
  const [statusFilter, setStatusFilter] = useState('new')
  const [platformFilter, setPlatformFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [scraperHealth, setScraperHealth] = useState<{ ok: boolean; staleSince: number | null } | null>(null)

  const fetchBestToday = useCallback(async () => {
    try {
      const res = await fetch('/api/deals/best-today', { headers: authHeaders() })
      if (res.ok) setBestToday(await res.json())
    } catch {}
  }, [])

  const fetchTop = useCallback(async () => {
    try {
      const res = await fetch('/api/deals/top?limit=10', { headers: authHeaders() })
      if (res.ok) {
        const data = await res.json()
        setTopDeals({ global: data.global ?? [], personal: data.personal ?? [] })
      }
    } catch {}
  }, [])

  const fetchDeals = useCallback(async (p = 1, append = false) => {
    const params = new URLSearchParams()
    if (statusFilter) params.set('status', statusFilter)
    if (platformFilter) params.set('platform', platformFilter)
    params.set('page', String(p))
    params.set('limit', '20')
    try {
      const res = await fetch(`/api/deals?${params}`, { headers: authHeaders() })
      if (!res.ok) { setLoading(false); setLoadingMore(false); return }
      const data = await res.json()
      const newDeals: Deal[] = data.deals || []
      setDeals(prev => append ? [...prev, ...newDeals] : newDeals)
      setHasMore(data.hasMore || false)
      setPage(p)
      const today = new Date().toISOString().split('T')[0]
      const allMargins = newDeals.map((d: Deal) => d.margin).filter(Boolean) as number[]
      setStats(prev => ({
        ...prev,
        total: data.total || 0,
        todayCount: (append ? prev.todayCount : 0) + newDeals.filter((d: Deal) => d.foundAt?.startsWith(today)).length,
        bestMargin: allMargins.length ? Math.max(...(append ? [prev.bestMargin ?? 0, ...allMargins] : allMargins)) : prev.bestMargin,
      }))
    } catch {}
    setLoading(false)
    setLoadingMore(false)
  }, [statusFilter, platformFilter])

  const loadMore = useCallback(async () => {
    setLoadingMore(true)
    await fetchDeals(page + 1, true)
  }, [fetchDeals, page])

  const fetchSearchCount = useCallback(async () => {
    try {
      const res = await fetch('/api/searches', { headers: authHeaders() })
      if (!res.ok) return
      const data = await res.json()
      setStats(prev => ({ ...prev, activeSearches: data.filter((s: { active: boolean; isGlobal?: boolean }) => s.active && !s.isGlobal).length }))
    } catch {}
  }, [])

  useEffect(() => {
    setLoading(true)
    setPage(1)
    fetch('/api/health/scraper').then(r => r.json()).then(setScraperHealth)
    fetchBestToday(); fetchTop(); fetchDeals(1); fetchSearchCount()
    const interval = setInterval(() => { fetchBestToday(); fetchTop(); fetchDeals(1) }, 60000)
    return () => clearInterval(interval)
  }, [fetchBestToday, fetchTop, fetchDeals, fetchSearchCount])

  const updateStatus = async (id: string, status: string) => {
    try {
      await fetch(`/api/deals/${id}`, {
        method: 'PATCH',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ status }),
      })
      setDeals(prev => prev.map(d => d.id === id ? { ...d, status } : d))
      fetchBestToday(); fetchTop()
    } catch {}
  }

  const deleteDeal = async (id: string) => {
    try {
      await fetch(`/api/deals/${id}`, { method: 'DELETE', headers: authHeaders() })
      setDeals(prev => prev.filter(d => d.id !== id))
      fetchBestToday(); fetchTop()
    } catch {}
  }

  const best = bestToday?.deal

  return (
    <div>
      <div className="mb-4 flex justify-end">
        {scraperHealth === null ? null : scraperHealth.ok ? (
          <span className="text-xs bg-green-500/20 text-green-400 border border-green-500/30 px-3 py-1 rounded-full">🟢 Scraper actif</span>
        ) : (
          <span className="text-xs bg-red-500/20 text-red-400 border border-red-500/30 px-3 py-1 rounded-full">
            🔴 Scraper inactif{scraperHealth.staleSince !== null ? ` (${scraperHealth.staleSince}min)` : ''}
          </span>
        )}
      </div>
      <div className="mb-8">
        {best ? (
          <div className="relative bg-gradient-to-r from-yellow-500/10 via-gray-900 to-gray-900 border border-yellow-500/30 rounded-2xl overflow-hidden p-6">
            <div className="absolute top-4 right-4">
              <span className="text-xs bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-3 py-1 rounded-full">
                {bestToday?.scope === 'today' ? "📅 Aujourd'hui" : '📆 Cette semaine'}
              </span>
            </div>
            <div className="flex gap-6 items-center">
              {best.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={proxyImage(best.imageUrl)} alt={best.title}
                  className="w-28 h-28 object-cover rounded-xl border border-yellow-500/20 flex-shrink-0 hidden md:block" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-yellow-400 font-bold text-sm uppercase tracking-wider">🏆 Meilleure affaire</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium text-white ${PLATFORM_COLORS[best.platform] || 'bg-gray-700'}`}>
                    {PLATFORM_EMOJI[best.platform]} {best.platform}
                  </span>
                </div>
                <h2 className="text-white font-bold text-xl leading-tight mb-1 truncate">{best.title}</h2>
                {best.search && (
                  <p className="text-gray-500 text-xs mb-3">{best.search.name}</p>
                )}
                <div className="flex items-end gap-4 flex-wrap">
                  <div>
                    <div className="text-4xl font-black text-yellow-400">{best.price}€</div>
                    {best.cardMarketPrice && (
                      <div className="text-gray-500 text-sm">médiane marché : {best.cardMarketPrice}€</div>
                    )}
                  </div>
                  {best.margin != null && (
                    <div className="bg-green-500/20 border border-green-500/30 rounded-xl px-4 py-2 text-center">
                      <div className="text-green-400 font-black text-2xl">-{best.margin.toFixed(0)}%</div>
                      <div className="text-green-600 text-xs">sous le marché</div>
                    </div>
                  )}
                  {best.location && (
                    <div className="text-gray-500 text-sm">📍 {best.location}</div>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-2 flex-shrink-0">
                <a href={best.url} target="_blank" rel="noopener noreferrer"
                  className="bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-bold px-6 py-3 rounded-xl transition-colors whitespace-nowrap text-sm">
                  Voir l&apos;annonce →
                </a>
                <button onClick={() => updateStatus(best.id, 'dismissed')}
                  className="text-xs text-gray-600 hover:text-gray-400 text-center transition-colors">
                  Ignorer
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center">
            <div className="text-4xl mb-3">🗓</div>
            <div className="text-white font-semibold">Aucun deal aujourd&apos;hui encore</div>
            <div className="text-gray-500 text-sm mt-1">
              Lance <code className="bg-gray-800 px-1 rounded text-yellow-400">python scraper/daily_scan.py</code> ou attend le scan de 12h
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Deals aujourd'hui", value: stats.todayCount, color: 'text-yellow-400' },
          { label: 'Total deals actifs', value: stats.total, color: 'text-blue-400' },
          { label: 'Meilleure marge', value: stats.bestMargin ? `-${stats.bestMargin.toFixed(0)}%` : '—', color: 'text-green-400' },
          { label: 'Recherches actives', value: stats.activeSearches, color: 'text-purple-400' },
        ].map(s => (
          <div key={s.label} className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-gray-400 text-sm mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="mb-10">
        <h2 className="text-lg font-bold text-white mb-4">🔥 Top 10 du moment</h2>
        {topDeals.global.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-yellow-400 mb-3">🌐 Scans automatiques (ETB / Display / Booster)</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4">
              {topDeals.global.map(deal => (
                <DealCard key={deal.id} deal={deal} onStatus={updateStatus} />
              ))}
            </div>
          </div>
        )}
        {topDeals.personal.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-blue-400 mb-3">📋 Mes recherches personnalisées</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4">
              {topDeals.personal.map(deal => (
                <DealCard key={deal.id} deal={deal} onStatus={updateStatus} />
              ))}
            </div>
          </div>
        )}
        {topDeals.global.length === 0 && topDeals.personal.length === 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-center text-gray-500 text-sm">
            Pas encore de deals — scans automatiques à 08h, 13h et 19h
          </div>
        )}
      </div>

      <div className="border-t border-gray-800 mb-8" />

      <div className="flex items-center gap-3 mb-5">
        <h2 className="text-lg font-bold text-white">📋 Mes alertes personnalisées</h2>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex gap-2">
          {(['new', 'seen', 'dismissed', ''] as const).map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${statusFilter === s ? 'bg-yellow-500 text-gray-900' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
              {s === '' ? 'Tous' : s === 'new' ? '🔥 Nouveaux' : s === 'seen' ? '👁 Vus' : '🗑 Ignorés'}
            </button>
          ))}
        </div>
        <div className="flex gap-2 ml-auto">
          {(['', 'leboncoin', 'vinted', 'ebay'] as const).map(p => (
            <button key={p} onClick={() => setPlatformFilter(p)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${platformFilter === p ? 'bg-gray-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
              {p === '' ? 'Toutes' : p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-4 animate-pulse">
              <div className="h-36 bg-gray-800 rounded-lg mb-4" />
              <div className="h-3 bg-gray-800 rounded w-1/3 mb-3" />
              <div className="h-4 bg-gray-800 rounded w-3/4 mb-2" />
              <div className="h-4 bg-gray-800 rounded w-1/2 mb-4" />
              <div className="h-8 bg-gray-800 rounded" />
            </div>
          ))}
        </div>
      ) : deals.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">🃏</div>
          <div className="text-gray-400">Aucun deal correspondant</div>
        </div>
      ) : (
        <>
          <div className="text-gray-500 text-xs mb-3">{stats.total} deal(s) au total</div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {deals.map(deal => (
              <DealCard key={deal.id} deal={deal} onStatus={updateStatus} onDelete={deleteDeal} />
            ))}
          </div>
          {hasMore && (
            <div className="flex justify-center gap-3 mt-8">
              <button
                onClick={() => { setPage(p => p - 1); fetchDeals(page - 1) }}
                disabled={page <= 1}
                className="bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-gray-300 px-5 py-2.5 rounded-xl text-sm font-medium transition-colors">
                ← Précédent
              </button>
              <span className="flex items-center text-gray-500 text-sm">Page {page}</span>
              <button
                onClick={loadMore}
                disabled={loadingMore || !hasMore}
                className="bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-gray-300 px-5 py-2.5 rounded-xl text-sm font-medium transition-colors">
                {loadingMore ? 'Chargement...' : 'Suivant →'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// ROOT — switche Landing / Dashboard selon auth
// ─────────────────────────────────────────────
export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null)

  useEffect(() => {
    setIsLoggedIn(!!getToken())
  }, [])

  if (isLoggedIn === null) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-6 h-6 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return isLoggedIn ? <Dashboard /> : <LandingPage />
}
