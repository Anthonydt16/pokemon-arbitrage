"""
filters.py — Filtres de qualité pour les résultats de scraping
"""
import re
import statistics

# ── Mots-clés négatifs ────────────────────────────────────────────────────────
NEGATIVE_KEYWORDS = [
    # Produits vides / incomplets
    'vide', 'sans booster', 'sans carte', 'boîte vide', 'boite vide',
    'emballage seul', 'boîte seule', 'boite seule', 'packaging',
    'reconditionné', 'reconditionnée',
    # Sous-produits ETB (cartes promo isolées)
    'svp-', 'svp ', 'svp173', 'black star promo',
    'carte promo', 'carte seule', 'promo card',
    'alt art holo', 'tcg card sealed',           # cartes unitaires
    'promo 173', 'eevee promo', 'evoli promo',
    # Cartes gradées (pas un produit scellé)
    ' psa ', 'psa 9', 'psa 10', 'psa8', 'psa9', 'psa10',
    'cgc ', 'cgc 9', 'cgc 10', 'bgs ',
    'gem mint', 'nm-mt', 'near mint',
    # Accessoires (FR + EN)
    'sleeve', 'sleeves', 'card sleeves', 'energy cards',
    'protège-cartes', 'classeur', 'portfolio', 'binder',
    'toploaders', 'top loader', 'penny sleeve', 'deck box', 'deckbox',
    'playmat', 'tapis de jeu', 'lot bundle',
    'sealed energy', '1,040', '1040 card',
    # Sous-produits ETB
    'artset', 'art set', 'art-set',
    'boîte surprise', 'boite surprise',
    'pochette accessoire', 'coin pocket',
    'bundle 6 boosters', 'bundle de 6',
    '6 boosters', '4 boosters',
    'sans film', 'sans shrink', 'ouvert',
    # Produits non-Pokémon
    'livre', 'manga', 'pub ', 'publicité', 'magazine', 'affiche',
    'poster', 'sticker', 'autocollant', 'figurine', 'peluche',
    'jeu vidéo', 'jeu video', 'nintendo ds', 'gameboy',
    'lego', 'nanoblock', 'funko',
    # Dérivés / goodies — exclusion explicite
    'pop pokemon', 'funko pop', 'pop vinyl', 'pop figure',
    'pin pokemon', "pin's pokemon", "pin's pokémon", 'pins pokemon', 'pins pokémon',
    'porte-clé', 'porte clé', 'porte-clés', 'porte clés',
    't-shirt', 'tshirt', 'sweat', 'casquette', 'sac ', 'sacoche',
    'peluche pokemon', 'doudou', 'pyjama',
    'tasse', 'mug ', 'verre ', 'assiette',
    'boite de rangement', 'boîte de rangement',
    'carte cadeau', 'bon cadeau',
    'goodies', 'gadget', 'dérivé',
    'pokeball décorative', 'réplique pokeball',
    'puzzle', 'jeu de société',
    # Fakes
    'proxy', 'orica', 'fan art', 'réplique', 'replica',
    'décoration', 'custom', 'fanmade',
    # Bruit divers
    'pour échange', 'lot hétérogène',
]

MIN_TITLE_LENGTH = 15
OUTLIER_FACTOR = 3.0

# ── Détection langue étrangère ───────────────────────────────────────────────
FOREIGN_LANG_KEYWORDS = [
    'jap', 'jp', 'japonais', 'japanese', 'japan',
    'asia', 's-chinese', 'chinese', 'korean', 'kor',
    'english', '(en)', 'eng ',
]
# Katakana U+30A0–U+30FF, Hiragana U+3040–U+309F
_KANA_RE = re.compile(r'[\u3040-\u30ff]')


# ── Détection produits scellés ──────────────────────────────────────────────
SEALED_KEYWORDS = [
    'etb', 'coffret dresseur', 'display', 'booster', 'tripack',
    'bundle', 'collection', 'scelle', 'neuf', 'blister', 'tin', 'lot booster',
]


def is_sealed_product(title: str) -> bool:
    """Retourne True si le titre indique un produit scellé (ETB, display, coffret…)."""
    t = title.lower()
    return any(kw in t for kw in SEALED_KEYWORDS)


def is_foreign_card(title: str) -> bool:
    """Retourne True si le titre indique une carte non-française (JAP, EN, etc.)."""
    t = title.lower()
    if any(kw in t for kw in FOREIGN_LANG_KEYWORDS):
        return True
    if _KANA_RE.search(title):
        return True
    return False


def _has_negative_keyword(title: str) -> bool:
    t = title.lower()
    return any(kw in t for kw in NEGATIVE_KEYWORDS)


def _has_required_keyword(title: str, keywords: list) -> bool:
    """
    Filtre positif : au moins un mot significatif de la recherche
    doit apparaître dans le titre.
    On découpe les keywords en tokens et on vérifie la présence d'au moins un.
    """
    if not keywords:
        return True
    title_lower = title.lower()
    # Tokens de 4+ caractères pour éviter les faux positifs sur mots courts
    tokens = [
        token for kw in keywords
        for token in kw.lower().split()
        if len(token) >= 4
    ]
    return any(token in title_lower for token in tokens)


def is_valid_result(item: dict, keywords: list = None) -> bool:
    title = item.get('title', '').strip()
    if len(title) < MIN_TITLE_LENGTH:
        return False
    if _has_negative_keyword(title):
        return False
    if item.get('price', 0) <= 0:
        return False
    # Filtre positif si des keywords sont fournis
    if keywords and not _has_required_keyword(title, keywords):
        return False
    return True


def remove_outliers(results: list) -> list:
    if len(results) < 4:
        return results
    prices = [r['price'] for r in results]
    median = statistics.median(prices)
    if median == 0:
        return results
    return [
        r for r in results
        if (median / OUTLIER_FACTOR) <= r['price'] <= (median * OUTLIER_FACTOR)
    ]


def compute_confidence(n: int) -> float:
    if n < 5:   return 0.2
    if n < 15:  return 0.5
    if n < 30:  return 0.8
    return 1.0


def filter_results(results: list, keywords: list = None, lang_filter: bool = False) -> tuple:
    """Retourne (résultats_filtrés, confidence_score)."""
    step1 = [r for r in results if is_valid_result(r, keywords)]
    removed_qual = len(results) - len(step1)

    if lang_filter:
        before_lang = len(step1)
        step1 = [r for r in step1 if not is_foreign_card(r.get('title', ''))]
        removed_lang = before_lang - len(step1)
        if removed_lang:
            print(f"  [Filtre] -{removed_lang} cartes étrangères (JAP/EN)")

    step2 = remove_outliers(step1)
    removed_outlier = len(step1) - len(step2)

    if removed_qual or removed_outlier:
        print(f"  [Filtre] -{removed_qual} qualité, -{removed_outlier} outliers → {len(step2)} valides")

    return step2, compute_confidence(len(step2))
