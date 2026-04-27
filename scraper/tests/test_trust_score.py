"""
tests/test_trust_score.py — Tests pour le module trust_score
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import pytest
from trust_score import compute_trust, _detect_product_type, _normalize


# ── _detect_product_type ─────────────────────────────────────────────────────────────

def test_detect_etb():
    """Titre ETB sans 'booster' → type etb."""
    t, _ = _detect_product_type(_normalize('ETB Flammes Obsidiennes coffret dresseur'))
    assert t == 'etb'


def test_detect_booster_etb_bug1():
    """Bug #1 : 'Booster Flammes Obsidiennes ETB' doit être booster, pas etb."""
    t, _ = _detect_product_type(_normalize('Booster Flammes Obsidiennes ETB scellé neuf'))
    assert t == 'booster'


def test_detect_tripack_bug2():
    """Bug #2 : 'Tripack Flammes Obsidiennes' doit être tripack, ni ETB ni booster."""
    t, _ = _detect_product_type(_normalize('Tripack Flammes Obsidiennes scellé neuf'))
    assert t == 'tripack'


def test_detect_tripack_blister():
    """Blister 3 boosters → tripack."""
    t, _ = _detect_product_type(_normalize('Blister 3 boosters Pokémon 151 scellé'))
    assert t == 'tripack'


def test_detect_display():
    """Display → type display, plancher 90."""
    t, floor = _detect_product_type(_normalize('Display 36 boosters Pokémon 151'))
    assert t == 'display'
    assert floor == 90


def test_detect_ultra_premium():
    """UPC → ultra premium."""
    t, _ = _detect_product_type(_normalize('Ultra Premium Collection Dracaufeu'))
    assert t == 'ultra premium'


def test_detect_lot_boosters():
    """Lot de boosters → lot boosters."""
    t, _ = _detect_product_type(_normalize('Lot de 10 boosters Pokémon scellés'))
    assert t == 'lot boosters'


def test_detect_coffret_generique():
    """Coffret générique sans ETB → coffret."""
    t, _ = _detect_product_type(_normalize('Coffret Dracaufeu EX scellé neuf'))
    assert t == 'coffret'


def test_tripack_has_floor():
    """Le plancher tripack est défini et réaliste."""
    t, floor = _detect_product_type(_normalize('Tripack Couronne Stellaire neuf'))
    assert t == 'tripack'
    assert floor >= 5


# ── compute_trust ─────────────────────────────────────────────────────────────────────

def test_deal_parfait_safe():
    """Deal avec tous les critères au max → level safe."""
    item = {
        'title': 'ETB Évolutions Prismatiques scellé neuf FR',
        'price': 60,
        'photoCount': 5,
        'isPro': True,
    }
    result = compute_trust(item, median=100.0, keywords=['etb', 'evolutions prismatiques'])
    assert result['level'] == 'safe'
    assert result['score'] >= 70


def test_prix_trop_bas_suspect():
    """Prix à -80% de la médiane + pas de photos + titre court → level suspect."""
    item = {
        'title': 'ETB lot',     # titre court, peu informatif
        'price': 10,            # -80% d'une médiane à 50€
        'photoCount': 0,        # pas de photos
        'isPro': False,
    }
    result = compute_trust(item, median=50.0, keywords=['etb'])
    # Score = 0 (prix) + 0 (titre court, aucune extension reconnue) + 0 (pas de photo) + 8 (particulier) + 0 (sous plancher etb=35) = 8
    assert result['level'] == 'suspect'
    assert result['score'] < 45
    assert 'pas_de_photo' in result['flags']


def test_pas_de_photo():
    """0 photo → flag pas_de_photo."""
    item = {
        'title': 'ETB Forces Temporelles scellé neuf coffret',
        'price': 40,
        'photoCount': 0,
        'isPro': False,
    }
    result = compute_trust(item, median=60.0, keywords=['etb', 'forces temporelles'])
    assert 'pas_de_photo' in result['flags']


def test_titre_trop_court():
    """Titre < 15 chars → flag titre_trop_court."""
    item = {
        'title': 'ETB',
        'price': 45,
        'photoCount': 2,
        'isPro': False,
    }
    result = compute_trust(item, median=60.0, keywords=['etb'])
    assert 'titre_trop_court' in result['flags']


def test_prix_sous_plancher_etb():
    """ETB à 20€ alors que le plancher est 35€ → flag prix_sous_plancher."""
    item = {
        'title': 'ETB Pokémon scellé coffret dresseur',
        'price': 20,
        'photoCount': 2,
        'isPro': False,
    }
    result = compute_trust(item, median=45.0, keywords=['etb'])
    assert 'prix_sous_plancher' in result['flags']


def test_vendeur_pro_score_eleve():
    """Vendeur pro + bon titre + photos → score élevé vs particulier."""
    base_item = {
        'title': 'ETB Destinées de Paldea coffret scellé neuf FR',
        'price': 50,
        'photoCount': 4,
    }
    result_pro = compute_trust({**base_item, 'isPro': True}, median=70.0, keywords=['etb'])
    result_part = compute_trust({**base_item, 'isPro': False}, median=70.0, keywords=['etb'])
    # Pro doit scorer plus haut que particulier
    assert result_pro['score'] > result_part['score']
    assert result_pro['score'] >= 70  # safe


def test_display_prix_correct():
    """Display à 100€ >= plancher 90€ → pas de flag prix_sous_plancher."""
    item = {
        'title': 'Display Évolutions Prismatiques 36 boosters scellé',
        'price': 100,
        'photoCount': 3,
        'isPro': True,
    }
    result = compute_trust(item, median=150.0, keywords=['display', 'evolutions prismatiques'])
    assert 'prix_sous_plancher' not in result['flags']
    assert result['level'] in ('safe', 'check')
