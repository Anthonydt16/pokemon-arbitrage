'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useI18n } from '@/lib/i18n'
import PokeSnoopLogo from '@/components/PokeSnoopLogo'
import { authHeaders, getToken } from '@/lib/client-auth'
import {
  CalendarDaysIcon,
  DocumentTextIcon,
  MapPinIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  TagIcon,
  ClockIcon,
  ArrowPathIcon,
  EyeIcon,
  TrashIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  BellAlertIcon,
  CpuChipIcon,
  ChartBarIcon,
  ShieldCheckIcon,
  AdjustmentsHorizontalIcon,
  GlobeAltIcon,
  LockClosedIcon
} from '@heroicons/react/24/outline'

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
  publishedAt?: string
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
  deals: Deal[]
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
const PLATFORM_COLORS_DOT: Record<string, string> = {
  leboncoin: 'bg-orange-500',
  vinted: 'bg-teal-500',
  ebay: 'bg-blue-500',
}

function DealCard({ deal, onStatus, onDelete, blurred, t }: {
  deal: Deal
  onStatus?: (id: string, s: string) => void
  onDelete?: (id: string) => void
  blurred?: boolean
  t: any
}) {
  const TRUST_CONFIG: Record<string, { label: string; className: string }> = {
    safe: { label: t('deals.safe'), className: 'bg-green-500/20 text-green-400 border border-green-500/40' },
    check: { label: t('deals.check'), className: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40' },
    suspect: { label: t('deals.suspect'), className: 'bg-red-500/20 text-red-400 border border-red-500/40' },
  }
  const TRUST_ICONS: Record<string, JSX.Element> = {
    safe: <CheckCircleIcon className="w-4 h-4 text-green-400 inline-block align-text-bottom" />, 
    check: <ExclamationTriangleIcon className="w-4 h-4 text-yellow-400 inline-block align-text-bottom" />, 
    suspect: <ExclamationTriangleIcon className="w-4 h-4 text-red-400 inline-block align-text-bottom" />
  }

  const trust = deal.trustLevel ? TRUST_CONFIG[deal.trustLevel] : null
  const trustIcon = deal.trustLevel ? TRUST_ICONS[deal.trustLevel] : null
  const flags: string[] = deal.trustFlags ? (() => { try { return JSON.parse(deal.trustFlags!) } catch { return [] } })() : []

  return (
    <div className={`min-w-0 w-full bg-gray-900 border border-gray-800 rounded-xl overflow-hidden hover:border-gray-700 transition-all relative ${blurred ? 'select-none' : ''}`}>
      {blurred && (
        <div className="absolute inset-0 z-10 backdrop-blur-sm bg-gray-950/60 flex flex-col items-center justify-center rounded-xl gap-3">
          <span className="text-2xl"><LockClosedIcon className="w-7 h-7 text-gray-400" /></span>
          <p className="text-sm text-gray-300 font-medium text-center px-4">{t('deals.signUpToSeeDeal')}</p>
          <Link href="/register" className="bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-bold text-xs px-4 py-2 rounded-lg transition-colors">
            {t('deals.signUpFree')}
          </Link>
        </div>
      )}
      {deal.imageUrl && (
        <img src={proxyImage(deal.imageUrl)} alt={deal.title} className="w-full h-36 object-cover" />
      )}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium text-white ${PLATFORM_COLORS[deal.platform] || 'bg-gray-700'} flex items-center gap-2`}>
            <span className={`inline-block w-4 h-4 rounded-full ${PLATFORM_COLORS_DOT[deal.platform] || 'bg-gray-500'}`} />
            {deal.platform}
          </span>
          <div className="flex items-center gap-2">
            {deal.margin != null && (
              <span className={`text-sm font-bold ${deal.margin >= 35 ? 'text-green-400' : 'text-yellow-400'}`}>
                -{deal.margin.toFixed(0)}%
              </span>
            )}
            {trust && (
              <div className="relative group flex-shrink-0">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium cursor-default whitespace-nowrap inline-flex items-center gap-1 ${trust.className}`}>
                  {trustIcon}<span>{trust.label}</span>
                </span>
                {flags.length > 0 && (
                  <div className="absolute right-0 top-6 z-10 hidden group-hover:block bg-gray-800 border border-gray-700 rounded-lg p-2 min-w-max shadow-lg">
                    <div className="text-xs text-gray-400 font-medium mb-1">Flags:</div>
                    {flags.map((f, i) => (
                      <div key={i} className="text-xs text-red-400 flex items-center gap-1"><ExclamationTriangleIcon className="w-3.5 h-3.5 inline-block" />{f.replace(/_/g, ' ')}</div>
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
            <span className="text-xs text-gray-500">~{deal.cardMarketPrice}€</span>
          )}
        </div>
        {deal.search && (
          <div className="text-xs text-gray-600 mb-1 flex items-center gap-1">
            {deal.search.isGlobal ? <CalendarDaysIcon className="w-4 h-4 inline-block align-text-bottom" /> : <DocumentTextIcon className="w-4 h-4 inline-block align-text-bottom" />} {deal.search.name}
          </div>
        )}
        {deal.location && <div className="text-xs text-gray-500 mb-2 flex items-center gap-1"><MapPinIcon className="w-4 h-4 inline-block align-text-bottom" />{deal.location}</div>}
        {!blurred && (
          <div className="flex gap-2 mt-3">
            <a href={deal.url} target="_blank" rel="noopener noreferrer"
              className="flex-1 text-center text-xs bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-semibold py-2 rounded-lg transition-colors flex items-center gap-1 justify-center">
              {t('deals.visitDeal')} <ArrowRightIcon className="w-4 h-4 inline-block align-text-bottom" />
            </a>
            {onStatus && deal.status === 'new' && (<>
              <button onClick={() => onStatus(deal.id, 'seen')} className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-2 rounded-lg" title="Vu"><EyeIcon className="w-4 h-4 inline-block" /></button>
              <button onClick={() => onStatus(deal.id, 'dismissed')} className="text-xs bg-gray-800 hover:bg-red-900 text-gray-300 px-3 py-2 rounded-lg" title="Supprimer"><TrashIcon className="w-4 h-4 inline-block" /></button>
            </>)}
            {onDelete && deal.status !== 'new' && (
              <button onClick={() => onDelete(deal.id)} className="text-xs bg-gray-800 hover:bg-red-900 text-gray-300 px-3 py-2 rounded-lg"><XMarkIcon className="w-4 h-4 inline-block" /></button>
            )}
          </div>
        )}
        <div className="text-xs text-gray-700 mt-2">
          {deal.publishedAt ? (
            <>
              {t('deals.publishedAt')}: {new Date(deal.publishedAt).toLocaleDateString(undefined, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
              <span className="mx-1">·</span>
              {t('deals.foundAt')}: {new Date(deal.foundAt).toLocaleDateString(undefined, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </>
          ) : (
            <>
              {t('deals.foundAt')}: {new Date(deal.foundAt).toLocaleDateString(undefined, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// LANDING PAGE
function LandingPage({ t }: { t: any }) {
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
    { icon: <BellAlertIcon className="w-8 h-8 text-yellow-400 mx-auto" />, title: t('home.activeSearches'), desc: "Ne ratez plus jamais une bonne affaire" },
    { icon: <CpuChipIcon className="w-8 h-8 text-blue-400 mx-auto" />, title: 'Scraping automatique', desc: 'Leboncoin, Vinted, eBay scannés 3× par jour' },
    { icon: <ChartBarIcon className="w-8 h-8 text-green-400 mx-auto" />, title: 'Prix marché en temps réel', desc: 'Comparaison automatique avec CardMarket' },
    { icon: <ShieldCheckIcon className="w-8 h-8 text-teal-400 mx-auto" />, title: 'Score de confiance', desc: 'Détection automatique des arnaques' },
    { icon: <AdjustmentsHorizontalIcon className="w-8 h-8 text-pink-400 mx-auto" />, title: 'Recherches personnalisées', desc: 'Alertes sur exactement ce que vous cherchez' },
    { icon: <GlobeAltIcon className="w-8 h-8 text-indigo-400 mx-auto" />, title: 'Scans globaux', desc: 'ETB, Display et Boosters pour tous' },
  ]

  return (
    <div className="-mx-4 -mt-8">
      <section className="relative overflow-hidden px-4 pt-20 pb-16 text-center">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-0 h-[500px] w-[900px] -translate-x-1/2 rounded-full bg-yellow-500/10 blur-3xl" />
        </div>
        <div className="hero-tagline-badge inline-flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-xs font-medium px-4 py-1.5 rounded-full mb-6">
          <ShieldCheckIcon className="w-5 h-5 inline-block align-text-bottom" /> PokeSnoop - {t('brand.tagline2')}
        </div>
        <div className="flex justify-center mb-6">
          <PokeSnoopLogo size={320} pokeColor="#dbe8ff" />
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-white leading-tight mb-6 max-w-4xl mx-auto">
          {t('brand.tagline')}
        </h1>
        <p className="text-gray-400 text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
          {t('home.description')}
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/register"
            className="bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-bold px-8 py-4 rounded-xl text-base transition-colors shadow-lg shadow-yellow-500/20">
            {t('auth.signUp')} →
          </Link>
          <Link href="/login"
            className="bg-gray-800 hover:bg-gray-700 text-white font-medium px-8 py-4 rounded-xl text-base transition-colors border border-gray-700">
            {t('auth.haveAccount')} {t('auth.signIn')}
          </Link>
        </div>
        <p className="mt-6 text-xs text-gray-600">✓ {t('messages.success')} · ✓ No card required · ✓ Instant alerts</p>
      </section>

      <section className="px-4 py-16 max-w-7xl mx-auto overflow-x-hidden">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-black text-white mb-3">🔥 Top Deals</h2>
        </div>
        {loadingDeals ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-4 animate-pulse">
                <div className="h-36 bg-gray-800 rounded-lg mb-4" />
                <div className="h-8 bg-gray-800 rounded" />
              </div>
            ))}
          </div>
        ) : topDeals.length === 0 ? (
          <div className="text-center py-12 bg-gray-900 border border-gray-800 rounded-2xl">
            <p className="text-gray-400">{t('home.noDeals')}</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 mb-4">
              {visibleDeals.map(deal => (
                <DealCard key={deal.id} deal={deal} t={t} />
              ))}
            </div>
          </>
        )}
      </section>

      <section className="px-4 py-16 bg-gray-900/40 border-y border-gray-800">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-black text-white mb-3">{t('home.everythingYouNeed')}</h2>
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

      <section className="px-4 py-20 text-center">
        <div className="relative max-w-2xl mx-auto bg-gradient-to-br from-yellow-500/10 via-gray-900 to-gray-900 border border-yellow-500/20 rounded-2xl p-12">
          <div className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-yellow-500/10 blur-3xl" />
          </div>
          <div className="text-4xl mb-4"><MagnifyingGlassIcon className="w-10 h-10 text-yellow-400 mx-auto" /></div>
          <h2 className="text-3xl font-black text-white mb-4">{t('brand.tagline3')}</h2>
          <p className="text-gray-400 mb-8 max-w-md mx-auto">
            {t('home.description')}
          </p>
          <Link href="/register"
            className="inline-block bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-bold px-10 py-4 rounded-xl text-base transition-colors shadow-lg shadow-yellow-500/20 flex items-center gap-2 justify-center">
            {t('home.getStarted')} <ArrowRightIcon className="w-5 h-5 inline-block align-text-bottom" />
          </Link>
        </div>
      </section>
    </div>
  )
}

// DASHBOARD
function Dashboard({ t }: { t: any }) {
  const RECENT_DEALS_PAGE_SIZE = 20
  const [bestToday, setBestToday] = useState<BestToday | null>(null)
  const [topDeals, setTopDeals] = useState<{ global: Deal[]; personal: Deal[] }>({ global: [], personal: [] })
  const [recentDeals, setRecentDeals] = useState<Deal[]>([])
  const [recentTotal, setRecentTotal] = useState(0)
  const [recentPage, setRecentPage] = useState(1)
  const [recentHasMore, setRecentHasMore] = useState(false)
  const [recentLoadingMore, setRecentLoadingMore] = useState(false)
  const [stats, setStats] = useState<Stats>({ total: 0, todayCount: 0, bestMargin: null, activeSearches: 0 })
  const [statusFilter, setStatusFilter] = useState('new')
  const [platformFilter, setPlatformFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const loadMoreRef = useRef<HTMLDivElement | null>(null)

  const getSinceIsoForFilter = useCallback((filter: string): string | undefined => {
    if (filter === 'all') return undefined

    const now = new Date()
    const since = new Date(now)

    if (filter === 'today') {
      since.setHours(0, 0, 0, 0)
      return since.toISOString()
    }

    if (filter === 'week') {
      since.setDate(since.getDate() - 7)
      return since.toISOString()
    }

    if (filter === 'month') {
      since.setDate(since.getDate() - 30)
      return since.toISOString()
    }

    return undefined
  }, [])

  useEffect(() => {
    const token = getToken()
    if (!token) {
      setLoading(false)
      return
    }

    const headers = authHeaders()
    const params = new URLSearchParams({ limit: String(RECENT_DEALS_PAGE_SIZE), page: '1' })
    const baseStatsParams = new URLSearchParams({ limit: '1', page: '1' })
    if (statusFilter !== 'all') params.set('status', statusFilter)
    if (platformFilter !== 'all') params.set('platform', platformFilter)
    const since = getSinceIsoForFilter(dateFilter)
    if (since) params.set('since', since)

    Promise.all([
      fetch('/api/deals/best-today', { headers }).then(r => r.ok ? r.json() : null),
      fetch('/api/deals/top?limit=10', { headers }).then(r => r.ok ? r.json() : null),
      fetch(`/api/deals?${params.toString()}`, { headers }).then(r => r.ok ? r.json() : null),
      fetch(`/api/deals?${baseStatsParams.toString()}`, { headers }).then(r => r.ok ? r.json() : null),
    ]).then(([best, top, deals, totalStats]) => {
      if (best) setBestToday(best)
      if (top) setTopDeals({ global: top.global ?? [], personal: top.personal ?? [] })
      if (deals) {
        setRecentDeals(deals.deals || [])
        setRecentTotal(typeof deals.total === 'number' ? deals.total : 0)
        setRecentPage(1)
        setRecentHasMore(Boolean(deals.hasMore))
      }
      if (totalStats) {
        setStats(prev => ({ ...prev, total: totalStats.total || 0 }))
      }
    }).finally(() => setLoading(false))
  }, [statusFilter, platformFilter, dateFilter, getSinceIsoForFilter])

  const loadMoreRecentDeals = useCallback(async () => {
    if (loading || recentLoadingMore || !recentHasMore) return

    const token = getToken()
    if (!token) return

    setRecentLoadingMore(true)
    const nextPage = recentPage + 1

    try {
      const params = new URLSearchParams({ limit: String(RECENT_DEALS_PAGE_SIZE), page: String(nextPage) })
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (platformFilter !== 'all') params.set('platform', platformFilter)
      const since = getSinceIsoForFilter(dateFilter)
      if (since) params.set('since', since)

      const res = await fetch(`/api/deals?${params.toString()}`, { headers: authHeaders() })
      if (!res.ok) return

      const data = await res.json()
      const incoming: Deal[] = Array.isArray(data?.deals) ? data.deals : []

      setRecentDeals(prev => {
        const merged = [...prev]
        const seen = new Set(prev.map(d => d.id))
        for (const deal of incoming) {
          if (!seen.has(deal.id)) merged.push(deal)
        }
        return merged
      })

      setRecentPage(nextPage)
      setRecentHasMore(Boolean(data?.hasMore))
      if (typeof data?.total === 'number') {
        setRecentTotal(data.total)
      }
    } finally {
      setRecentLoadingMore(false)
    }
  }, [loading, recentLoadingMore, recentHasMore, recentPage, statusFilter, platformFilter, dateFilter, getSinceIsoForFilter])

  useEffect(() => {
    if (loading) return

    const sentinel = loadMoreRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0]?.isIntersecting) {
          loadMoreRecentDeals()
        }
      },
      { root: null, rootMargin: '250px 0px', threshold: 0 }
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [loading, loadMoreRecentDeals])

  const displayedDeals = recentDeals
  const hasActiveFilters = statusFilter !== 'all' || platformFilter !== 'all' || dateFilter !== 'all'

  if (loading) return <div className="text-center py-12">{t('messages.loading')}</div>
  if (!getToken()) return <LandingPage t={t} />

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="text-gray-500 text-sm mb-1">{t('home.totalDeals')}</div>
          <div className="text-3xl font-bold text-white">{stats.total}</div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="text-gray-500 text-sm mb-1">Today</div>
          <div className="text-3xl font-bold text-yellow-400">{stats.todayCount}</div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="text-gray-500 text-sm mb-1">{t('home.bestMargin')}</div>
          <div className="text-3xl font-bold text-green-400">{stats.bestMargin ? `${stats.bestMargin.toFixed(0)}%` : '-'}</div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="text-gray-500 text-sm mb-1">{t('home.activeSearches')}</div>
          <div className="text-3xl font-bold text-blue-400">{stats.activeSearches}</div>
        </div>
      </div>

      <div className="flex flex-col gap-6 mb-8">
        {!!bestToday?.deals?.length && (
          <div className="overflow-x-hidden">
            <h3 className="text-lg font-bold text-white mb-4">{t('home.topDealsToday')}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {bestToday.deals.map(deal => (
                <DealCard key={deal.id} deal={deal} t={t} />
              ))}
            </div>
          </div>
        )}
        <div>
          <div className="bg-gray-900/70 border border-gray-800 rounded-2xl p-4 sm:p-5 mb-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-white">{t('home.recentDeals')}</h3>
                <p className="text-sm text-gray-400 mt-1">{t('home.recentDealsHint')}</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-300">
                <span className="inline-flex items-center gap-1 rounded-full border border-gray-700 bg-gray-900 px-3 py-1.5">
                  <FunnelIcon className="w-4 h-4" />
                  {recentTotal} {t('home.resultsLabel')}
                </span>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={() => { setStatusFilter('all'); setPlatformFilter('all'); setDateFilter('all') }}
                    className="inline-flex items-center gap-1 rounded-full border border-gray-700 bg-gray-900 px-3 py-1.5 text-gray-300 hover:text-white hover:border-gray-600 transition-colors"
                  >
                    <ArrowPathIcon className="w-4 h-4" />
                    {t('home.resetFilters')}
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <div className="rounded-xl border border-gray-800 bg-gray-950/60 p-3">
                <div className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-yellow-300 mb-2">
                  <FunnelIcon className="w-4 h-4" />
                  {t('home.filterGroupStatus')}
                </div>
                <div className="flex flex-wrap gap-2">
                  {(['all', 'new', 'seen', 'dismissed'] as const).map(status => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setStatusFilter(status)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${statusFilter === status ? 'bg-yellow-500 text-gray-900 border-yellow-400' : 'bg-gray-900 text-gray-300 border-gray-700 hover:border-gray-600'}`}
                    >
                      {t(`home.filterStatus.${status}`)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-gray-800 bg-gray-950/60 p-3">
                <div className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-blue-300 mb-2">
                  <TagIcon className="w-4 h-4" />
                  {t('home.filterGroupPlatform')}
                </div>
                <div className="flex flex-wrap gap-2">
                  {(['all', 'leboncoin', 'vinted', 'ebay'] as const).map(platform => (
                    <button
                      key={platform}
                      type="button"
                      onClick={() => setPlatformFilter(platform)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${platformFilter === platform ? 'bg-blue-500 text-white border-blue-400' : 'bg-gray-900 text-gray-300 border-gray-700 hover:border-gray-600'}`}
                    >
                      {t(`home.filterPlatform.${platform}`)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-gray-800 bg-gray-950/60 p-3">
                <div className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-green-300 mb-2">
                  <ClockIcon className="w-4 h-4" />
                  {t('home.filterGroupDate')}
                </div>
                <div className="flex flex-wrap gap-2">
                  {(['all', 'today', 'week', 'month'] as const).map(period => (
                    <button
                      key={period}
                      type="button"
                      onClick={() => setDateFilter(period)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${dateFilter === period ? 'bg-green-500 text-white border-green-400' : 'bg-gray-900 text-gray-300 border-gray-700 hover:border-gray-600'}`}
                    >
                      {t(`home.filterDate.${period}`)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {displayedDeals.length === 0 ? (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center">
              <div className="mb-3 flex justify-center">
                <MagnifyingGlassIcon className="w-10 h-10 text-gray-500" />
              </div>
              <h4 className="text-white font-bold text-lg mb-2">{t('home.noRecentDealsTitle')}</h4>
              <p className="text-gray-500 text-sm max-w-md mx-auto">{t('home.noRecentDealsDesc')}</p>
              {recentHasMore && (
                <p className="mt-3 text-xs text-gray-400">{t('home.loadingMoreDeals')}</p>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {displayedDeals.map(deal => (
                  <DealCard key={deal.id} deal={deal} t={t} />
                ))}
              </div>
              {recentLoadingMore && (
                <div className="mt-4 text-center text-sm text-gray-400">{t('home.loadingMoreDeals')}</div>
              )}
              {!recentHasMore && displayedDeals.length > 0 && (
                <div className="mt-4 text-center text-xs text-gray-500">{t('home.endOfRecentDeals')}</div>
              )}
            </>
          )}

          <div ref={loadMoreRef} className="h-2 w-full" aria-hidden="true" />
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  const { t } = useI18n()
  return <Dashboard t={t} />
}
