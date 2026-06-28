"""
price_reference.py — Référence de prix combinée
- Produits scellés (ETB, display, coffret) → médiane du marché scrapé
- Cartes singles → TCGdex (gratuit, sans clé, noms FR natifs, prix CardMarket en EUR)

TCGdex API : https://api.tcgdex.net/v2/fr/
- Recherche par nom français directement
- Prix CardMarket en EUR mis à jour quotidiennement
- Pas de traduction FR→EN nécessaire
- Pas de clé API
"""

import requests
import time
import statistics
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))
from filters import is_foreign_card

TCGDEX_API = 'https://api.tcgdex.net/v2/fr'
TIMEOUT = 8

SEALED_KEYWORDS = [
    'etb', 'elite trainer', 'coffret dresseur', 'display', '36 boosters',
    'upc', 'ultra premium', 'coffret', 'bundle', 'lot boosters', 'booster box',
    'boite boosters', 'collection premium',
    # Tripacks / trip pack variants (éviter de confondre avec ETB)
    'tripack', 'trip pack', 'trip-pack', 'trip-pack',
]

_cache: dict = {}
CACHE_TTL = 3600 * 6  # 6h


def _is_sealed(title: str, keywords: list = None) -> bool:
    text = (title + ' ' + ' '.join(keywords or [])).lower()
    return any(kw in text for kw in SEALED_KEYWORDS)


def _extract_pokemon_name(title: str, keywords: list) -> str:
    """
    Extrait le nom du Pokémon en français depuis le titre ou les keywords.
    Prend le token le plus long (probablement le nom du Pokémon).
    """
    # Tokens significatifs des keywords
    tokens = sorted(
        [t for kw in keywords for t in kw.split() if len(t) >= 4],
        key=len, reverse=True
    )
    if tokens:
        return tokens[0]
    # Fallback : premier mot long du titre
    words = [w for w in title.split() if len(w) >= 4]
    return words[0] if words else ''


RARITY_HINTS = {
    'vmax': 'VMAX', 'vstar': 'VSTAR', ' ex ': 'ex', '-ex': 'ex',
    ' v ': 'V', '-v ': 'V', 'gx': 'GX', 'full art': 'full art',
    'alt art': 'alt art', 'rainbow': 'rainbow', 'gold': 'gold',
    'illustration rare': 'illustration rare', 'special': 'special',
    'radieux': 'radieux', 'brillant': 'brillant',
}


def _get_tcgdex_price(pokemon_fr: str, title: str = '') -> float | None:
    """
    Recherche le Pokémon par nom FR sur TCGdex.
    Si un numéro de carte est détecté dans le titre (ex: 9/68),
    on cherche la carte exacte pour un prix précis.
    """
    import re as _re
    if not pokemon_fr:
        return None

    key = pokemon_fr.lower().strip() + '|' + title[:40].lower()
    if key in _cache:
        price, ts = _cache[key]
        if time.time() - ts < CACHE_TTL:
            return price

    try:
        # Détecte un numéro de carte dans le titre (ex: "9/68", "183/198")
        card_number_match = _re.search(r'\b(\d{1,3})/(\d{2,3})\b', title)

        # 1. Recherche par nom FR
        r = requests.get(
            f'{TCGDEX_API}/cards',
            params={'name': pokemon_fr},
            timeout=TIMEOUT,
        )
        if r.status_code != 200:
            _cache[key] = (None, time.time())
            return None

        cards_brief = r.json()
        if not cards_brief:
            _cache[key] = (None, time.time())
            return None

        # 2. Si numéro de carte détecté, essaie de matcher la carte exacte
        if card_number_match:
            local_id = card_number_match.group(1)
            matching = [c for c in cards_brief if str(c.get('localId', '')) == local_id]
            if matching:
                cards_brief = matching  # On prend uniquement la carte exacte

        # 2. Détecte si une variante rare est mentionnée dans le titre
        title_low = title.lower()
        is_rare_variant = any(h in title_low for h in RARITY_HINTS)

        # 3. Récupère les détails + prix des cartes
        prices_30d = []
        prices_trend = []
        fetched = 0
        for card in cards_brief[:15]:
            card_id = card.get('id')
            if not card_id:
                continue
            detail_r = requests.get(f'{TCGDEX_API}/cards/{card_id}', timeout=TIMEOUT)
            if detail_r.status_code != 200:
                continue
            detail = detail_r.json()
            cm = detail.get('pricing', {}).get('cardmarket', {})
            if not cm:
                continue
            avg30 = cm.get('avg30')
            trend = cm.get('trend')
            # Si variante rare dans le titre → garde seulement les cartes chères (>20€)
            if is_rare_variant:
                if avg30 and avg30 > 20:
                    prices_30d.append(avg30)
                if trend and trend > 20:
                    prices_trend.append(trend)
            else:
                if avg30 and avg30 > 0:
                    prices_30d.append(avg30)
                if trend and trend > 0:
                    prices_trend.append(trend)
            fetched += 1
            time.sleep(0.1)

        # Priorité avg30, sinon trend
        prices = prices_30d or prices_trend
        if not prices:
            _cache[key] = (None, time.time())
            return None

        # Médiane pour éviter les outliers (une carte ultra-rare ne doit pas
        # fausser la référence d'une carte commune du même Pokémon)
        price = round(statistics.median(prices), 2)
        print(f"  [TCGdex] '{pokemon_fr}': {fetched} cartes | médiane avg30 = {price}€")
        _cache[key] = (price, time.time())
        return price

    except Exception as e:
        print(f"  [TCGdex] Erreur '{pokemon_fr}': {e}")
        return None


def get_reference_price(
    title: str,
    keywords: list,
    scraped_median: float,
    scraped_count: int,
) -> dict:
    """
    Retourne :
    - reference_price  : meilleur prix de référence en €
    - source           : 'tcgdex_cardmarket' | 'median'
    - tcg_price_eur    : prix TCGdex en € si disponible
    - confidence_boost : True si TCGdex confirme la cohérence
    - warning          : message si problème détecté
    """
    result = {
        'reference_price': scraped_median,  # médiane fraîche du scan en cours
        'source': 'median',
        'tcg_price_eur': None,
        'confidence_boost': False,
        'warning': None,
    }

    # Produit scellé → médiane locale uniquement (TCGdex ne couvre pas les scellés)
    # On utilise scraped_median passé en paramètre, PAS lastAvgPrice de la DB
    if _is_sealed(title, keywords):
        return result

    # Single → appel TCGdex
    pokemon_fr = _extract_pokemon_name(title, keywords)
    if not pokemon_fr:
        return result

    tcg_price = _get_tcgdex_price(pokemon_fr, title)

    if tcg_price is None:
        result['warning'] = f"'{pokemon_fr}' introuvable sur TCGdex/CardMarket"
        return result

    result['tcg_price_eur'] = tcg_price

    # Logique de décision
    if tcg_price >= scraped_median * 1.15:
        # CardMarket dit que ça vaut plus → référence plus haute, deal mieux qualifié
        result['reference_price'] = tcg_price
        result['source'] = 'tcgdex_cardmarket'
        result['confidence_boost'] = True
    elif tcg_price < scraped_median * 0.6 and scraped_count < 20:
        # Médiane biaisée (peu d'annonces), CardMarket dit moins cher
        result['reference_price'] = tcg_price
        result['source'] = 'tcgdex_cardmarket'
        result['warning'] = f"Médiane biaisée ({scraped_count} rés.), CM={tcg_price}€"
    else:
        # Cohérents → médiane locale + confiance boostée
        result['source'] = 'median'
        result['confidence_boost'] = True

    return result
