'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useI18n } from '@/lib/i18n'
import { authHeaders, getToken } from '@/lib/client-auth'

type SettingsState = {
  discordWebhook: string
  alertMinMargin: number
  alertGlobal: boolean
  discordWebhookSet?: boolean
}

export default function SettingsPage() {
  const { t, locale } = useI18n()
  const router = useRouter()
  const [settings, setSettings] = useState<SettingsState>({
    discordWebhook: '',
    alertMinMargin: 15,
    alertGlobal: true,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!getToken()) {
      setLoading(false)
      router.replace(`/${locale}`)
      return
    }

    const load = async () => {
      try {
        const res = await fetch('/api/settings', { headers: authHeaders() })
        if (!res.ok) {
          throw new Error('Failed to load settings')
        }
        const data = await res.json()
        setSettings({
          discordWebhook: data.discordWebhook ?? '',
          alertMinMargin: data.alertMinMargin ?? 15,
          alertGlobal: !!data.alertGlobal,
          discordWebhookSet: !!data.discordWebhookSet,
        })
      } catch (e) {
        setError(t('messages.error'))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [locale, router, t])

  const saveSettings = async () => {
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          discordWebhook: settings.discordWebhook,
          alertMinMargin: settings.alertMinMargin,
          alertGlobal: settings.alertGlobal,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || t('messages.error'))
      } else {
        setSettings(prev => ({ ...prev, discordWebhookSet: !!data.discordWebhookSet }))
        setMessage(t('settings.saved'))
      }
    } catch (e) {
      setError(t('messages.error'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="text-gray-400">{t('messages.loading')}</div>
  }

  if (!getToken()) return null

  const sliderPercent = Math.max(0, Math.min(100, settings.alertMinMargin))

  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-bold text-white mb-6">{t('settings.title')}</h1>

      {error && (
        <div className="mb-4 bg-red-900/40 border border-red-700 text-red-300 text-sm px-4 py-3 rounded-lg">
          {error}
        </div>
      )}
      {message && (
        <div className="mb-4 bg-green-900/40 border border-green-700 text-green-300 text-sm px-4 py-3 rounded-lg">
          {message}
        </div>
      )}

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Discord Webhook</label>
          <input
            type="url"
            value={settings.discordWebhook}
            onChange={e => setSettings(prev => ({ ...prev, discordWebhook: e.target.value }))}
            placeholder="https://discord.com/api/webhooks/..."
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500"
          />
          <p className="text-xs text-gray-500 mt-2">
            {settings.discordWebhookSet ? 'Webhook configuré' : 'Aucun webhook configuré'}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Marge minimale d'alerte (%)</label>
          <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs uppercase tracking-wide text-gray-400">Seuil d'alerte</span>
              <span className="bg-yellow-500 text-gray-900 text-sm font-bold px-3 py-1 rounded-full">
                {settings.alertMinMargin}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={settings.alertMinMargin}
              onChange={e => setSettings(prev => ({ ...prev, alertMinMargin: Number(e.target.value) || 0 }))}
              className="snoop-range w-full cursor-pointer"
              style={{
                background: `linear-gradient(to right, #facc15 0%, #facc15 ${sliderPercent}%, #1f2937 ${sliderPercent}%, #1f2937 100%)`,
              }}
            />
            <div className="mt-2 flex justify-between text-xs text-gray-500">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setSettings(prev => ({ ...prev, alertGlobal: !prev.alertGlobal }))}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.alertGlobal ? 'bg-green-500' : 'bg-gray-700'}`}
          >
            <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${settings.alertGlobal ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
          <span className="text-sm text-gray-300">Activer les alertes globales</span>
        </div>

        <div>
          <button
            onClick={saveSettings}
            disabled={saving}
            className="bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-gray-900 font-semibold px-6 py-2.5 rounded-lg transition-colors"
          >
            {saving ? `${t('messages.loading')}` : t('settings.save')}
          </button>
        </div>
      </div>
    </div>
  )
}
