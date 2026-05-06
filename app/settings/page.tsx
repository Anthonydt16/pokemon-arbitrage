'use client'
import { useEffect, useState } from 'react'
import { authHeaders } from '@/lib/client-auth'

type Settings = {
  discordWebhook: string | null
  discordWebhookSet: boolean
  alertMinMargin: number
  alertGlobal: boolean
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [webhookInput, setWebhookInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null)

  useEffect(() => {
    fetch('/api/settings', { headers: authHeaders() })
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(d => {
        setSettings(d)
        // Ne pré-remplit pas le champ (sécurité)
      })
      .catch(err => console.error('[settings load]', err))
  }, [])

  const showMsg = (type: 'ok' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 4000)
  }

  const save = async () => {
    setSaving(true)
    const body: Record<string, unknown> = {
      alertMinMargin: settings?.alertMinMargin,
      alertGlobal: settings?.alertGlobal,
    }
    if (webhookInput.trim()) body.discordWebhook = webhookInput.trim()
    const res = await fetch('/api/settings', {
      method: 'PATCH',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (!res.ok || !data.ok) {
      showMsg('error', data.error || 'Erreur lors de la sauvegarde')
      setSaving(false)
      return
    }
    setSettings(prev => prev ? { ...prev, discordWebhookSet: data.discordWebhookSet } : prev)
    setWebhookInput('')
    // Si un nouveau webhook a été configuré, on le teste automatiquement
    if (webhookInput.trim() && data.discordWebhookSet) {
      const testRes = await fetch('/api/settings', { method: 'POST', headers: authHeaders() })
      const testData = await testRes.json()
      if (testData.ok) showMsg('ok', 'Webhook configuré et testé avec succès ✅')
      else showMsg('error', `Webhook sauvegardé mais test échoué : ${testData.error}`)
    } else {
      showMsg('ok', 'Paramètres sauvegardés ✅')
    }
    setSaving(false)
  }

  const testWebhook = async () => {
    setTesting(true)
    const res = await fetch('/api/settings', { method: 'POST', headers: authHeaders() })
    const data = await res.json()
    if (data.ok) showMsg('ok', 'Message de test envoyé sur Discord ✅')
    else showMsg('error', data.error || 'Échec du test')
    setTesting(false)
  }

  const clearWebhook = async () => {
    if (!confirm('Supprimer le webhook Discord ?')) return
    await fetch('/api/settings', {
      method: 'PATCH',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ discordWebhook: '' }),
    })
    setSettings(prev => prev ? { ...prev, discordWebhookSet: false, discordWebhook: null } : prev)
    showMsg('ok', 'Webhook supprimé')
  }

  if (!settings) return <div className="text-gray-500 text-center py-20">Chargement...</div>

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Paramètres</h1>
        <p className="text-gray-400 text-sm mt-1">Configurez vos alertes Discord personnalisées</p>
      </div>

      {message && (
        <div className={`mb-6 px-4 py-3 rounded-lg text-sm font-medium ${message.type === 'ok' ? 'bg-green-900/40 border border-green-700 text-green-300' : 'bg-red-900/40 border border-red-700 text-red-300'}`}>
          {message.text}
        </div>
      )}

      {/* Section Webhook Discord */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">🔔</span>
          <div>
            <h2 className="text-white font-semibold">Webhook Discord</h2>
            <p className="text-gray-400 text-xs mt-0.5">Recevez les alertes deals directement dans votre serveur Discord</p>
          </div>
          {settings.discordWebhookSet && (
            <span className="ml-auto text-xs bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-1 rounded-full">
              ✅ Configuré
            </span>
          )}
        </div>

        {/* Comment créer un webhook */}
        <div className="bg-gray-800/60 rounded-lg p-3 mb-4 text-xs text-gray-400">
          <span className="text-gray-300 font-medium">Comment créer un webhook :</span>
          <ol className="mt-1 ml-4 space-y-0.5 list-decimal">
            <li>Ouvrez votre serveur Discord → channel de votre choix</li>
            <li>Paramètres du channel → Intégrations → Webhooks</li>
            <li>Créer un webhook → copiez l'URL</li>
          </ol>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-sm text-gray-300 mb-1.5">URL du webhook</label>
            <input
              type="url"
              value={webhookInput}
              onChange={e => setWebhookInput(e.target.value)}
              placeholder={settings.discordWebhookSet ? '••••••••• (configuré — laissez vide pour conserver)' : 'https://discord.com/api/webhooks/...'}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-yellow-500 transition-colors"
            />
          </div>

          <div className="flex gap-2">
            {settings.discordWebhookSet && (
              <button
                onClick={testWebhook}
                disabled={testing}
                className="text-sm bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg transition-colors"
              >
                {testing ? 'Envoi...' : '🧪 Tester le webhook'}
              </button>
            )}
            {settings.discordWebhookSet && (
              <button
                onClick={clearWebhook}
                className="text-sm bg-gray-800 hover:bg-red-900 text-red-400 px-4 py-2 rounded-lg transition-colors"
              >
                Supprimer
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Section alertes */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
        <div className="flex items-center gap-3 mb-5">
          <span className="text-2xl">⚡</span>
          <div>
            <h2 className="text-white font-semibold">Paramètres des alertes</h2>
            <p className="text-gray-400 text-xs mt-0.5">Configurez quand vous souhaitez être alerté</p>
          </div>
        </div>

        <div className="space-y-5">
          {/* Seuil de marge */}
          <div>
            <label className="block text-sm text-gray-300 mb-1.5">
              Marge minimum pour une alerte
              <span className="text-yellow-400 font-bold ml-2">{settings.alertMinMargin}%</span>
            </label>
            <input
              type="range"
              min={5} max={60} step={5}
              value={settings.alertMinMargin}
              onChange={e => setSettings(prev => prev ? { ...prev, alertMinMargin: parseInt(e.target.value) } : prev)}
              className="w-full accent-yellow-500"
            />
            <div className="flex justify-between text-xs text-gray-600 mt-1">
              <span>5% (beaucoup)</span>
              <span>30% (recommandé)</span>
              <span>60% (only fire 🔥)</span>
            </div>
          </div>

          {/* Alertes scan global */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-300">Alertes scan quotidien global</div>
              <div className="text-xs text-gray-500 mt-0.5">ETB, Display, Coffrets détectés à 12h</div>
            </div>
            <button
              onClick={() => setSettings(prev => prev ? { ...prev, alertGlobal: !prev.alertGlobal } : prev)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.alertGlobal ? 'bg-green-500' : 'bg-gray-700'}`}
            >
              <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${settings.alertGlobal ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Info : alertes liées aux recherches */}
      <div className="bg-blue-900/20 border border-blue-700/30 rounded-xl p-4 mb-6 text-xs text-blue-300">
        <span className="font-medium">ℹ️ Comment ça marche :</span> Les alertes Discord correspondent uniquement à vos recherches personnalisées
        (et au scan global si activé). Chaque deal déclenche une notification avec le titre, le prix, la marge et un lien direct vers l'annonce.
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-gray-900 font-bold px-8 py-3 rounded-xl transition-colors"
      >
        {saving ? 'Sauvegarde...' : 'Sauvegarder'}
      </button>
    </div>
  )
}
