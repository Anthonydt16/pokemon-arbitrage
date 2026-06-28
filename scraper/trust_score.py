"""
trust_score.py — Calcule un score de confiance (0-100) pour chaque deal Pokémon.
"""

import re
import unicodedata

KNOWN_EXTENSIONS = [
    'evolutions prismatiques', 'destinees paldea', 'pokemon 151',
    'failles paradoxales', 'couronne stellaire', 'forces temporelles',
    'mascarade', 'flammes obsidiennes', 'ecarlate violet',
    'etb', 'display', 'coffret', 'scelle', 'neuf',
]

PRICE_FLOORS = {
    'display': 90,
    'ultra premium': 60,
    'upc': 60,
    'coffret': 15,
    'tripack': 10,
    'lot boosters': 15,
    'etb': 35,
    'coffret dresseur': 35,  # alias ETB — conservé pour compatibilité
    'booster': 3,
}

# Ordre de détection du type produit : du plus spécifique au moins spécifique.
# Règle clé : si le titre contient "booster" ET "etb", c'est un booster
# (ex: "Booster Flammes Obsidienne ETB") — pas une ETB box.
_BOOSTER_RE  = re.compile(r'\bbooster\b')
_ETB_RE      = re.compile(r'\b(etb|elite\s*trainer|coffret\s*dresseur)\b')
_TRIPACK_RE  = re.compile(r'\b(tripack|tri[\s-]pack|blister\s*3)\b')
_COFFRET_RE  = re.compile(r'\b(coffret|collection\s*(?:premium|speciale))\b')


def _detect_product_type(title_norm: str) -> tuple:
    """
    Détecte le type de produit dominant à partir du titre normalisé.
    Retourne (product_type, price_floor) ou (None, None) si non reconnu.

    Ordre de priorité (du plus spécifique au moins spécifique) :
      display > ultra premium > coffret générique > tripack >
      lot boosters > etb > booster

    Correction bug #1 : "Booster X ETB" → booster, pas ETB.
    Correction bug #2 : "Tripack X" → tripack, pas ETB ni booster.
    """
    has_etb     = bool(_ETB_RE.search(title_norm))
    has_booster = bool(_BOOSTER_RE.search(title_norm))

    # 1. Display / box complète → priorité absolue
    if re.search(r'\b(display|36\s*boosters?|booster\s*box)\b', title_norm):
        return 'display', PRICE_FLOORS['display']

    # 2. Ultra Premium Collection
    if re.search(r'\b(ultra\s*premium|upc)\b', title_norm):
        return 'ultra premium', PRICE_FLOORS['ultra premium']

    # 3. Coffret générique (cadeau, collection, sans être un ETB)
    #    Ex: "Coffret Dracaufeu EX", "Collection Premium Pikachu"
    #    Exclusion : "coffret dresseur" (ETB) est capturé plus bas via has_etb
    if _COFFRET_RE.search(title_norm) and not has_etb:
        return 'coffret', PRICE_FLOORS['coffret']

    # 4. Tripack / blister 3 boosters
    #    Priorité sur ETB et booster : "Tripack Flammes Obsidiennes" ≠ ETB
    if _TRIPACK_RE.search(title_norm):
        return 'tripack', PRICE_FLOORS['tripack']

    # 5. Lot de boosters
    if re.search(r'\blot\s*(de\s*)?\d*\s*(boosters?|bo[iî]tes?)\b', title_norm):
        return 'lot boosters', PRICE_FLOORS['lot boosters']

    # 6. ETB / Coffret Dresseur Élite
    #    Bug #1 : si "booster" ET "etb" sont présents, le produit vendu
    #    est un booster individuel issu d'un ETB → on le classe booster.
    if has_etb and not has_booster:
        return 'etb', PRICE_FLOORS['etb']
    if has_etb and has_booster:
        return 'booster', PRICE_FLOORS['booster']

    # 7. Booster seul
    if has_booster:
        return 'booster', PRICE_FLOORS['booster']

    return None, None


def _normalize(text: str) -> str:
    """Lowercase + remove accents for fuzzy matching."""
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
    # Utilise _detect_product_type pour éviter de classifier un booster comme ETB
    # simplement parce que "ETB" apparaît dans son titre (bug #1).
    _, detected_floor = _detect_product_type(title_norm)

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
