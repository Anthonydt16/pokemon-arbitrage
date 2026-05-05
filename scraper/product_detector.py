"""
product_detector.py — Détecte le type ET l'extension d'un produit Pokémon
Clé = "Type Extension" ex: "ETB Flammes Obsidiennes", "Tripack Flammes Obsidiennes"
"""

import re
import unicodedata

# ── Types de produits (ordre : du plus spécifique au plus général) ────────────
PRODUCT_TYPES = [
    ('display',   r'\bdisplay\b|36\s*boosters?'),
    ('upc',       r'ultra\s*premium|upc\b'),
    ('tripack',   r'\btripack\b|3\s*boosters?\s*(sous\s*blister|blister)|blister\s*3'),
    ('blister',   r'\bblister\b|\bsous[\s-]blister\b'),
    ('lot',       r'\blot\s*(de\s*)?\d+|\blot\s+boosters?|\blot\s+pokemon'),
    ('booster',   r'\bbooster\b|\bboosters?\s*(scell|neuf|pokémon|pokemon)'),
    ('etb',       r'\betb\b|coffret\s*dresseur|elite\s*trainer'),
    ('coffret',   r'\bcoffret\b|\bcollection\b'),
]

# ── Extensions (ordre : du plus spécifique au plus général) ──────────────────
EXTENSION_PATTERNS = [
    ('Évolutions Prismatiques', r'ev8\.5|evolutions?\s*prismatiques?'),
    ('Equilibre Parfait',       r'ev10|equilibre\s*parfait'),
    ('Aventures Ensemble',      r'ev9\b|ev09\b|aventures?\s*ensemble'),
    ('Couronne Stellaire',      r'ev7\b|couronne\s*stellaire'),
    ('Mascarade Crépusculaire', r'ev6\.5|mascarade\s*cr[eé]pusculaire'),
    ('Forces Temporelles',      r'ev5\b|forces?\s*temporelles?'),
    ('Destinées de Paldea',     r'ev4\.5|destin[eé]es?\s*(?:de\s*)?paldea'),
    ('Failles Paradoxales',     r'ev4\b(?!\.5)|failles?\s*paradox(?:al(?:e|es)?|e(?:s)?)'),
    ('Pokémon 151',             r'ev3\.5|pok[eé]mon\s*151'),
    ('Flammes Obsidiennes',     r'ev3\b(?!\.5)|flammes?\s*obsidiennes?'),
    ('Méga-Flamme ME02',        r'me02|me2\b|mega\s*flamme'),
    ('Méga-Évolution ME01',     r'me01|me1\b|mega\s*[eé]volution'),
    ('Écarlate et Violet',      r'sv[12]\b|[eé]carlate\s*(?:et\s*)?violet(?!\s*(?:ev|de))'),
    ('Évolutions à Paldea',     r'ev[12]\b|[eé]volutions?\s*[aà]\s*paldea'),
    ('Fable Nébuleuse',         r'ev6\b(?!\.5)|fable\s*n[eé]buleuse'),
    ('Dracaufeu',               r'dracaufeu|charizard'),
    ('Pikachu',                 r'\bpikachu\b'),
    ('Mewtwo',                  r'\bmewtwo\b'),
]

# Noms lisibles par type
TYPE_LABELS = {
    'display':  'Display',
    'upc':      'Coffret Ultra Premium',
    'tripack':  'Tripack',
    'blister':  'Blister',
    'booster':  'Booster',
    'lot':      'Lot Boosters',
    'etb':      'ETB',
    'coffret':  'Coffret',
}


def _normalize(s: str) -> str:
    nfkd = unicodedata.normalize('NFKD', s.lower())
    return ''.join(c for c in nfkd if not unicodedata.combining(c))


def detect_type(title: str) -> str | None:
    t = _normalize(title)
    for key, pattern in PRODUCT_TYPES:
        if re.search(pattern, t):
            return key
    return None


def detect_extension(title: str) -> str | None:
    t = _normalize(title)
    for name, pattern in EXTENSION_PATTERNS:
        if re.search(pattern, t):
            return name
    return None


def detect_product(title: str) -> str | None:
    """
    Retourne "Type Extension" ex: "ETB Flammes Obsidiennes"
    ou None si le type OU l'extension est inconnu.
    """
    ptype = detect_type(title)
    ext = detect_extension(title)
    if not ptype or not ext:
        return None
    return f"{TYPE_LABELS[ptype]} {ext}"


def group_by_product(items: list) -> dict:
    """
    Groupe une liste d'items par produit détecté.
    { "ETB Flammes Obsidiennes": [...], "Tripack Flammes Obsidiennes": [...], "unknown": [...] }
    """
    groups = {}
    for item in items:
        product = detect_product(item['title']) or 'unknown'
        groups.setdefault(product, []).append(item)
    return groups
