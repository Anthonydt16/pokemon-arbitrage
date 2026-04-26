"""
trust_score.py — Calcule un score de confiance (0-100) pour chaque deal Pokémon.
"""

import re

KNOWN_EXTENSIONS = [
    'evolutions prismatiques', 'destinees paldea', 'pokemon 151',
    'failles paradoxales', 'couronne stellaire', 'forces temporelles',
    'mascarade', 'flammes obsidiennes', 'ecarlate violet',
    'etb', 'display', 'coffret', 'scelle', 'neuf',
]

PRICE_FLOORS = {
    'etb': 35,
    'coffret dresseur': 35,
    'display': 90,
    'booster': 3,
    'lot boosters': 15,
    'ultra premium': 60,
    'upc': 60,
}


def _normalize(text: str) -> str:
    """Lowercase + remove accents for fuzzy matching."""
    import unicodedata
    nfkd = unicodedata.normalize('NFKD', text.lower())
    return ''.join(c for c in nfkd if not unicodedata.combining(c))


def compute_trust(item: dict, median: float, keywords: list) -> dict:
    """
    Calcule le score de confiance d'un deal.

    Args:
        item: dict avec au minimum 'title', 'price', 'photoCount', 'isPro'
        median: prix médian du marché
        keywords: mots-clés de la recherche

    Returns:
        dict { score: int, level: str, flags: list[str] }
    """
    score = 0
    flags = []

    title = item.get('title', '') or ''
    price = float(item.get('price', 0) or 0)
    photo_count = item.get('photoCount')
    is_pro = item.get('isPro')

    title_norm = _normalize(title)

    # ── Critère 1 — Écart prix vs médiane (30 pts) ──────────────────────────
    if median and median > 0:
        discount = (median - price) / median  # positif si prix < médiane
        if -0.15 <= discount < 0:
            # prix légèrement AU DESSUS de la médiane (< -15%) → deal léger
            score += 25
        elif 0.15 <= discount <= 0.60:
            # Entre -15% et -60% sous la médiane → bonne affaire
            score += 30
        elif 0.60 < discount <= 0.75:
            # Entre -60% et -75% → trop beau, suspect
            score += 15
        elif discount > 0.75:
            # > -75% → très suspect
            score += 0
        else:
            # price > médiane, donc deal léger quand même
            score += 25
    else:
        # Pas de médiane → on ne peut pas évaluer, score neutre
        score += 15

    # ── Critère 2 — Qualité du titre (25 pts) ───────────────────────────────
    title_pts = 0
    if len(title) > 30:
        title_pts += 10
    elif len(title) < 15:
        flags.append('titre_trop_court')

    for ext in KNOWN_EXTENSIONS:
        if ext in title_norm:
            title_pts += 10
            break

    if 'fr' in title.lower().split() or 'français' in title_norm or ' fr ' in f' {title_norm} ':
        title_pts += 5

    score += min(title_pts, 25)

    # ── Critère 3 — Photos (20 pts) ─────────────────────────────────────────
    if photo_count is None:
        score += 5  # inconnu → neutre bas
    elif photo_count == 0:
        flags.append('pas_de_photo')
        score += 0
    elif photo_count == 1:
        score += 5
    elif photo_count == 2:
        score += 12
    else:  # 3+
        score += 20

    # ── Critère 4 — Vendeur Pro vs Particulier (15 pts) ─────────────────────
    if is_pro is True:
        score += 15
    else:
        score += 8  # particulier ou inconnu

    # ── Critère 5 — Prix plancher cohérent (10 pts) ──────────────────────────
    detected_floor = None
    for product_key, floor in PRICE_FLOORS.items():
        if product_key in title_norm:
            detected_floor = floor
            break

    if detected_floor is not None:
        if price >= detected_floor:
            score += 10
        else:
            flags.append('prix_sous_plancher')
            score += 0
    else:
        score += 5  # produit non reconnu → neutre

    # ── Niveau final ─────────────────────────────────────────────────────────
    score = max(0, min(100, score))
    if score >= 70:
        level = 'safe'
    elif score >= 45:
        level = 'check'
    else:
        level = 'suspect'

    return {
        'score': score,
        'level': level,
        'flags': flags,
    }
