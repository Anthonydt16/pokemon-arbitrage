import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

async function getSettings() {
  return prisma.settings.upsert({
    where: { id: 'default' },
    update: {},
    create: { id: 'default', alertMinMargin: 15, alertGlobal: true },
  })
}

export async function GET() {
  const settings = await getSettings()
  // On masque partiellement le webhook pour l'affichage
  return NextResponse.json({
    ...settings,
    discordWebhook: settings.discordWebhook
      ? settings.discordWebhook.replace(/\/[^/]+$/, '/****')
      : null,
    discordWebhookSet: !!settings.discordWebhook,
  })
}

export async function PATCH(req: Request) {
  const body = await req.json()
  const data: Record<string, unknown> = {}

  if (body.discordWebhook !== undefined) {
    // Validation basique de l'URL webhook Discord
    const url = body.discordWebhook
    if (url && !url.startsWith('https://discord.com/api/webhooks/') && !url.startsWith('https://discordapp.com/api/webhooks/')) {
      return NextResponse.json({ error: 'URL webhook Discord invalide' }, { status: 400 })
    }
    data.discordWebhook = url || null
  }
  if (body.alertMinMargin !== undefined) data.alertMinMargin = parseFloat(body.alertMinMargin)
  if (body.alertGlobal !== undefined) data.alertGlobal = body.alertGlobal

  const settings = await prisma.settings.upsert({
    where: { id: 'default' },
    update: data,
    create: { id: 'default', alertMinMargin: 15, alertGlobal: true, ...data },
  })

  return NextResponse.json({ ok: true, discordWebhookSet: !!settings.discordWebhook })
}

// Test le webhook en envoyant un message de test
export async function POST() {
  const settings = await getSettings()
  if (!settings.discordWebhook) {
    return NextResponse.json({ error: 'Aucun webhook configuré' }, { status: 400 })
  }

  try {
    const res = await fetch(settings.discordWebhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [{
          title: '✅ PokéArbitrage — Test webhook',
          description: 'Votre webhook Discord est correctement configuré ! Vous recevrez les alertes deals ici.',
          color: 0x00CC88,
          footer: { text: 'PokéArbitrage · Alertes en temps réel' },
          timestamp: new Date().toISOString(),
        }],
      }),
    })
    if (!res.ok) return NextResponse.json({ error: `Discord a répondu ${res.status}` }, { status: 400 })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
