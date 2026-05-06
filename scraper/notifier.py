"""
notifier.py — Alertes Discord via webhook
Les settings sont par utilisateur (table Settings liée à User).
- Scan personnel  → alerte uniquement l'owner de la recherche
- Scan global     → alerte tous les users avec alertGlobal=true
"""

import os
import requests
import psycopg2
import psycopg2.extras

DB_URL = os.environ.get('DATABASE_URL', 'postgresql://pokemon:pokemon@localhost:5432/pokemon')

PLATFORM_EMOJI = {
    'leboncoin': '🟠',
    'vinted': '🟢',
    'ebay': '🔵',
}


def _get_settings_for_user(user_id: str) -> dict:
    """Lit les paramètres d'un utilisateur précis."""
    try:
        conn = psycopg2.connect(DB_URL)
        conn.autocommit = True
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute('SELECT * FROM "Settings" WHERE "userId" = %s', (user_id,))
        row = cur.fetchone()
        conn.close()
        if row:
            return dict(row)
    except Exception as e:
        print(f"  [Discord] Erreur lecture settings user {user_id}: {e}")
    return {'discordWebhook': None, 'alertMinMargin': 15, 'alertGlobal': True}


def _get_all_settings_with_webhook() -> list:
    """Retourne les settings de tous les users ayant un webhook configuré."""
    try:
        conn = psycopg2.connect(DB_URL)
        conn.autocommit = True
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute('SELECT * FROM "Settings" WHERE "discordWebhook" IS NOT NULL AND "discordWebhook" != \'\'')
        rows = cur.fetchall()
        conn.close()
        return [dict(r) for r in rows]
    except Exception as e:
        print(f"  [Discord] Erreur lecture settings globaux: {e}")
    return []


def _get_search_owner(search_id: str) -> str | None:
    """Retourne le userId propriétaire d'une recherche."""
    try:
        conn = psycopg2.connect(DB_URL)
        conn.autocommit = True
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute('SELECT "userId" FROM "Search" WHERE id = %s', (search_id,))
        row = cur.fetchone()
        conn.close()
        if row:
            return row['userId']
    except Exception as e:
        print(f"  [Discord] Erreur lecture owner search: {e}")
    return None


def _send(webhook_url: str, payload: dict) -> bool:
    try:
        r = requests.post(webhook_url, json=payload, timeout=10)
        if r.status_code not in (200, 204):
            print(f"  [Discord] Erreur {r.status_code}")
            return False
        return True
    except Exception as e:
        print(f"  [Discord] Erreur: {e}")
        return False


def _build_embed(deal: dict, search_name: str, avg_price: float, margin: float, confidence: float) -> dict:
    emoji = '🔥' if margin >= 35 else '✅'
    platform = deal.get('platform', '')
    platform_emoji = PLATFORM_EMOJI.get(platform, '📦')

    embed = {
        "title": f"{emoji} Deal Pokémon détecté !",
        "color": 0xFFD700 if margin >= 35 else 0x00CC88,
        "fields": [
            {"name": "📦 Produit", "value": deal['title'][:256], "inline": False},
            {"name": "💶 Prix", "value": f"**{deal['price']}€**", "inline": True},
            {"name": "📊 Réf. marché", "value": f"{avg_price:.2f}€", "inline": True},
            {"name": "📈 Sous-valorisation", "value": f"**-{margin:.0f}%**", "inline": True},
            {"name": f"{platform_emoji} Plateforme", "value": platform.capitalize(), "inline": True},
            {"name": "🔍 Recherche", "value": search_name, "inline": True},
            {"name": "🎯 Confiance", "value": f"{confidence:.0%}", "inline": True},
            {"name": "🔗 Lien", "value": f"[Voir l'annonce]({deal['url']})", "inline": False},
        ],
        "footer": {"text": "PokéArbitrage · Alerte personnalisée"},
        "timestamp": __import__('datetime').datetime.utcnow().isoformat() + 'Z',
    }
    if deal.get('imageUrl'):
        embed["thumbnail"] = {"url": deal['imageUrl']}
    return embed


def send_deal_alert(
    deal: dict,
    search_name: str,
    avg_price: float,
    margin: float,
    confidence: float,
    is_global: bool = False,
    search_id: str | None = None,
):
    """Envoie une alerte Discord pour un deal détecté.

    - is_global=True  → envoie à tous les users avec alertGlobal=true
    - is_global=False → envoie uniquement à l'owner de la recherche
    """
    embed = _build_embed(deal, search_name, avg_price, margin, confidence)

    if is_global:
        # Alerte tous les users qui ont un webhook ET alertGlobal activé
        all_settings = _get_all_settings_with_webhook()
        for s in all_settings:
            if not s.get('alertGlobal', True):
                continue
            min_margin = s.get('alertMinMargin', 15)
            if margin < min_margin:
                continue
            _send(s['discordWebhook'], {"embeds": [embed]})
    else:
        # Recherche personnelle → uniquement l'owner
        user_id = search_id and _get_search_owner(search_id)
        if not user_id:
            return
        settings = _get_settings_for_user(user_id)
        webhook_url = settings.get('discordWebhook')
        if not webhook_url:
            return
        min_margin = settings.get('alertMinMargin', 15)
        if margin < min_margin:
            return
        _send(webhook_url, {"embeds": [embed]})


def send_daily_summary(total_deals: int, items_scanned: int):
    """Résumé du scan quotidien — envoyé à tous les users avec alertGlobal=true."""
    all_settings = _get_all_settings_with_webhook()
    for s in all_settings:
        if not s.get('alertGlobal', True):
            continue
        _send(s['discordWebhook'], {
            "embeds": [{
                "title": "🗓 Scan quotidien terminé",
                "color": 0x5865F2,
                "fields": [
                    {"name": "📦 Produits scannés", "value": str(items_scanned), "inline": True},
                    {"name": "🔥 Deals trouvés", "value": str(total_deals), "inline": True},
                ],
                "footer": {"text": "PokéArbitrage · Prochain scan à 12h00"},
                "timestamp": __import__('datetime').datetime.utcnow().isoformat() + 'Z',
            }]
        })
