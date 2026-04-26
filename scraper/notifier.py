"""
notifier.py — Alertes Discord via webhook
Le webhook est lu depuis la DB (table Settings) à chaque appel.
Pas de variable d'env nécessaire — tout se configure depuis l'UI.
"""

import sqlite3
import os
import requests

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'prisma', 'dev.db')

PLATFORM_EMOJI = {
    'leboncoin': '🟠',
    'vinted': '🟢',
    'ebay': '🔵',
}


def _get_settings() -> dict:
    """Lit les paramètres depuis la DB."""
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()
        cur.execute("SELECT * FROM Settings WHERE id = 'default'")
        row = cur.fetchone()
        conn.close()
        if row:
            return dict(row)
    except Exception:
        pass
    return {'discordWebhook': None, 'alertMinMargin': 15, 'alertGlobal': True}


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


def send_deal_alert(
    deal: dict,
    search_name: str,
    avg_price: float,
    margin: float,
    confidence: float,
    is_global: bool = False,
):
    """Envoie une alerte Discord pour un deal détecté."""
    settings = _get_settings()
    webhook_url = settings.get('discordWebhook')

    if not webhook_url:
        return  # Pas de webhook configuré

    # Vérifie le seuil de marge
    min_margin = settings.get('alertMinMargin', 15)
    if margin < min_margin:
        return

    # Si deal global, vérifie que l'option est activée
    if is_global and not settings.get('alertGlobal', True):
        return

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

    _send(webhook_url, {"embeds": [embed]})


def send_daily_summary(total_deals: int, items_scanned: int):
    """Résumé du scan quotidien."""
    settings = _get_settings()
    webhook_url = settings.get('discordWebhook')

    if not webhook_url or not settings.get('alertGlobal', True):
        return

    _send(webhook_url, {
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
