'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useI18n } from '@/lib/i18n'
import PokeSnoopLogo from '@/components/PokeSnoopLogo'
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
const PLATFORM_EMOJI: Record<string, string> = {
  leboncoin: '🟠', vinted: '🟢', ebay: '🔵',
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
  const TRUST_EMOJI: Record<string, string> = { safe: '🟢', check: '🟡', suspect: '🔴' }

  const trust = deal.trustLevel ? TRUST_CONFIG[deal.trustLevel] : null
  const trustEmoji = deal.trustLevel ? TRUST_EMOJI[deal.trustLevel] : null
  const flags: string[] = deal.trustFlags ? (() => { try { return JSON.parse(deal.trustFlags!) } catch { return [] } })() : []

  return (
    <div className={`bg-gray-900 border border-gray-800 rounded-xl overflow-hidden hover:border-gray-700 transition-all relative ${blurred ? 'select-none' : ''}`}>
      {blurred && (
        <div className="absolute inset-0 z-10 backdrop-blur-sm bg-gray-950/60 flex flex-col items-center justify-center rounded-xl gap-3">
          <span className="text-2xl">🔒</span>
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
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium text-white ${PLATFORM_COLORS[deal.platform] || 'bg-gray-700'}`}>
            {PLATFORM_EMOJI[deal.platform]} {deal.platform}
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
                  <span>{trustEmoji}</span><span>{trust.label}</span>
                </span>
                {flags.length > 0 && (
                  <div className="absolute right-0 top-6 z-10 hidden group-hover:block bg-gray-800 border border-gray-700 rounded-lg p-2 min-w-max shadow-lg">
                    <div className="text-xs text-gray-400 font-medium mb-1">Flags:</div>
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
            <span className="text-xs text-gray-500">~{deal.cardMarketPrice}€</span>
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
              {t('deals.visitDeal')} →
            </a>
            {onStatus && deal.status === 'new' && (<>
              <button onClick={() => onStatus(deal.id, 'seen')} className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-2 rounded-lg" title="Seen">👁</button>
              <button onClick={() => onStatus(deal.id, 'dismissed')} className="text-xs bg-gray-800 hover:bg-red-900 text-gray-300 px-3 py-2 rounded-lg" title="Dismiss">🗑</button>
            </>)}
            {onDelete && deal.status !== 'new' && (
              <button onClick={() => onDelete(deal.id)} className="text-xs bg-gray-800 hover:bg-red-900 text-gray-300 px-3 py-2 rounded-lg">✕</button>
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
    { icon: '🔔', title: t('home.activeSearches'), desc: "Ne ratez plus jamais une bonne affaire" },
    { icon: '🤖', title: 'Scraping automatique', desc: 'Leboncoin, Vinted, eBay scannés 3× par jour' },
    { icon: '📊', title: 'Prix marché en temps réel', desc: 'Comparaison automatique avec CardMarket' },
    { icon: '🛡️', title: 'Score de confiance', desc: 'Détection automatique des arnaques' },
    { icon: '🎯', title: 'Recherches personnalisées', desc: 'Alertes sur exactement ce que vous cherchez' },
    { icon: '🌐', title: 'Scans globaux', desc: 'ETB, Display et Boosters pour tous' },
  ]

  return (
    <div className="-mx-4 -mt-8">
      <section className="relative overflow-hidden px-4 pt-20 pb-16 text-center">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-0 h-[500px] w-[900px] -translate-x-1/2 rounded-full bg-yellow-500/10 blur-3xl" />
        </div>
        <div className="hero-tagline-badge inline-flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-xs font-medium px-4 py-1.5 rounded-full mb-6">
          🃏 PokeSnoop - {t('brand.tagline2')}
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

      <section className="px-4 py-16 max-w-7xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-black text-white mb-3">🔥 Top Deals</h2>
        </div>
        {loadingDeals ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 mb-4">
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
          <div className="text-4xl mb-4">🔍</div>
          <h2 className="text-3xl font-black text-white mb-4">{t('brand.tagline3')}</h2>
          <p className="text-gray-400 mb-8 max-w-md mx-auto">
            {t('home.description')}
          </p>
          <Link href="/register"
            className="inline-block bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-bold px-10 py-4 rounded-xl text-base transition-colors shadow-lg shadow-yellow-500/20">
            {t('home.getStarted')} →
          </Link>
        </div>
      </section>
    </div>
  )
}

// DASHBOARD
function Dashboard({ t }: { t: any }) {
  const [bestToday, setBestToday] = useState<BestToday | null>(null)
  const [topDeals, setTopDeals] = useState<{ global: Deal[]; personal: Deal[] }>({ global: [], personal: [] })
  const [deals, setDeals] = useState<Deal[]>([])
  const [stats, setStats] = useState<Stats>({ total: 0, todayCount: 0, bestMargin: null, activeSearches: 0 })
  const [statusFilter, setStatusFilter] = useState('new')
  const [platformFilter, setPlatformFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = getToken()
    if (!token) {
      setLoading(false)
      return
    }

    const headers = authHeaders()
    const params = new URLSearchParams({ limit: '20' })
    if (statusFilter !== 'all') params.set('status', statusFilter)
    if (platformFilter !== 'all') params.set('platform', platformFilter)

    Promise.all([
      fetch('/api/deals/best-today', { headers }).then(r => r.ok ? r.json() : null),
      fetch('/api/deals/top?limit=10', { headers }).then(r => r.ok ? r.json() : null),
      fetch(`/api/deals?${params.toString()}`, { headers }).then(r => r.ok ? r.json() : null),
    ]).then(([best, top, deals]) => {
      if (best) setBestToday(best)
      if (top) setTopDeals({ global: top.global ?? [], personal: top.personal ?? [] })
      if (deals) {
        setDeals(deals.deals || [])
        setStats(prev => ({ ...prev, total: deals.total || 0 }))
      }
    }).finally(() => setLoading(false))
  }, [statusFilter, platformFilter])

  const displayedDeals = deals.filter((deal) => {
    const dateValue = deal.publishedAt || deal.foundAt
    const dealDate = new Date(dateValue)
    if (Number.isNaN(dealDate.getTime())) return false

    const now = new Date()
    const startOfToday = new Date(now)
    startOfToday.setHours(0, 0, 0, 0)

    if (dateFilter === 'today') {
      return dealDate >= startOfToday
    }

    if (dateFilter === 'week') {
      const weekAgo = new Date(now)
      weekAgo.setDate(weekAgo.getDate() - 7)
      return dealDate >= weekAgo
    }

    if (dateFilter === 'month') {
      const monthAgo = new Date(now)
      monthAgo.setDate(monthAgo.getDate() - 30)
      return dealDate >= monthAgo
    }

    return true
  })

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
          <div>
            <h3 className="text-lg font-bold text-white mb-4">{t('home.topDealsToday')}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
              {bestToday.deals.map(deal => (
                <DealCard key={deal.id} deal={deal} t={t} />
              ))}
            </div>
          </div>
        )}
        <div>
          <div className="flex flex-col gap-3 mb-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h3 className="text-lg font-bold text-white">{t('home.recentDeals')}</h3>
              <p className="text-sm text-gray-500 mt-1">{t('home.recentDealsHint')}</p>
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

          <div className="flex flex-wrap gap-2 mb-4">
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

          <div className="flex flex-wrap gap-2 mb-4">
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

          {displayedDeals.length === 0 ? (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center">
              <div className="text-4xl mb-3">🔎</div>
              <h4 className="text-white font-bold text-lg mb-2">{t('home.noRecentDealsTitle')}</h4>
              <p className="text-gray-500 text-sm max-w-md mx-auto">{t('home.noRecentDealsDesc')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {displayedDeals.map(deal => (
                <DealCard key={deal.id} deal={deal} t={t} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  const { t } = useI18n()
  return <Dashboard t={t} />
}
