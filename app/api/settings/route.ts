import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

function requireUser(req: NextRequest) {
  const user = getAuthUser(req)
  if (!user) return null
  return user
}

async function getSettings(userId: string) {
  return prisma.settings.upsert({
    where: { userId },
    update: {},
    create: { userId, alertMinMargin: 15, alertGlobal: true },
  })
}

export async function GET(req: NextRequest) {
  const user = requireUser(req)
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  try {
    const settings = await getSettings(user.userId)
    return NextResponse.json({
      ...settings,
      discordWebhook: settings.discordWebhook
        ? settings.discordWebhook.replace(/\/[^\/]+$/, '/****')
        : null,
      discordWebhookSet: !!settings.discordWebhook,
    })
  } catch (e) {
    console.error('[settings GET]', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const user = requireUser(req)
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const body = await req.json()
  const data: Record<string, unknown> = {}

  if (body.discordWebhook !== undefined) {
    const url = body.discordWebhook
    if (url && !url.startsWith('https://discord.com/api/webhooks/') && !url.startsWith('https://discordapp.com/api/webhooks/')) {
      return NextResponse.json({ error: 'URL webhook Discord invalide' }, { status: 400 })
    }
    data.discordWebhook = url || null
  }
  if (body.alertMinMargin !== undefined) data.alertMinMargin = parseFloat(body.alertMinMargin)
  if (body.alertGlobal !== undefined) data.alertGlobal = body.alertGlobal

  try {
    const settings = await prisma.settings.upsert({
      where: { userId: user.userId },
      update: data,
      create: { userId: user.userId, alertMinMargin: 15, alertGlobal: true, ...data },
    })
    return NextResponse.json({ ok: true, discordWebhookSet: !!settings.discordWebhook })
  } catch (e) {
    console.error('[settings PATCH]', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const user = requireUser(req)
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const settings = await getSettings(user.userId)
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
