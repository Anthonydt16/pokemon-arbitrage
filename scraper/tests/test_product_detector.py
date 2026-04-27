"""
test_product_detector.py — Tests unitaires pour product_detector
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from product_detector import detect_product, detect_type, detect_extension, group_by_product


# ── Type detection ────────────────────────────────────────────────────────────
def test_type_tripack():
    assert detect_type("Tripack Flammes Obsidiennes EV3") == 'tripack'

def test_type_booster():
    assert detect_type("Booster sous blister flammes obsidiennes") == 'blister'

def test_type_display():
    assert detect_type("Display Évolutions Prismatiques 36 boosters") == 'display'

def test_type_etb():
    assert detect_type("ETB Aventures Ensemble EV9 neuf scellé") == 'etb'

def test_type_lot():
    assert detect_type("Lot de 3 boosters pokemon flammes") == 'lot'

# ── Extension detection ───────────────────────────────────────────────────────
def test_ext_flammes_ev3():
    assert detect_extension("Tripack Flammes Obsidiennes EV3") == 'Flammes Obsidiennes'

def test_ext_evolutions_prismatiques():
    assert detect_extension("ETB Évolutions Prismatiques EV8.5") == 'Évolutions Prismatiques'

def test_ext_aventures_ensemble():
    assert detect_extension("ETB Aventures Ensemble EV9") == 'Aventures Ensemble'

def test_ext_pokemon_151():
    assert detect_extension("Coffret Pokemon 151 EV3.5") == 'Pokémon 151'

# ── Full product detection ────────────────────────────────────────────────────
def test_etb_aventures_ensemble():
    assert detect_product("ETB Aventures Ensemble EV9 neuf scellé") == 'ETB Aventures Ensemble'

def test_tripack_flammes():
    # Un tripack Flammes Obsidiennes ≠ ETB Flammes Obsidiennes
    assert detect_product("Tripack Pokemon Flammes Obsidiennes EV3") == 'Tripack Flammes Obsidiennes'

def test_booster_flammes():
    assert detect_product("Booster sous blister flammes obsidiennes EV3") == 'Blister Flammes Obsidiennes'

def test_display_evolutions_prismatiques():
    assert detect_product("Display Évolutions Prismatiques EV8.5 36 boosters") == 'Display Évolutions Prismatiques'

def test_etb_flammes_obsidiennes():
    assert detect_product("ETB Flammes Obsidiennes EV3 scellé neuf") == 'ETB Flammes Obsidiennes'

def test_etb_pokemon_151():
    assert detect_product("Coffret dresseur Elite Pokemon 151 EV3.5 scellé") == 'ETB Pokémon 151'

def test_upc_dracaufeu():
    assert detect_product("Ultra Premium Collection Dracaufeu UPC scellé") == 'Coffret Ultra Premium Dracaufeu'

def test_unknown_no_type():
    assert detect_product("Lot de trucs divers") is None

def test_case_insensitive():
    assert detect_product("ETB FLAMMES OBSIDIENNES EV3") == 'ETB Flammes Obsidiennes'

# ── group_by_product ──────────────────────────────────────────────────────────
def test_group_separates_etb_and_tripack():
    items = [
        {'title': 'ETB Flammes Obsidiennes EV3 neuf',         'price': 50},
        {'title': 'Tripack Pokemon Flammes Obsidiennes EV3',  'price': 18},
        {'title': 'Booster sous blister flammes obs EV3',     'price': 8},
        {'title': 'ETB Aventures Ensemble EV9 scellé',        'price': 70},
    ]
    groups = group_by_product(items)
    assert 'ETB Flammes Obsidiennes' in groups
    assert 'Tripack Flammes Obsidiennes' in groups
    assert 'ETB Aventures Ensemble' in groups
    # ETB Flammes et Tripack Flammes sont dans des groupes séparés
    assert len(groups['ETB Flammes Obsidiennes']) == 1
    assert len(groups['Tripack Flammes Obsidiennes']) == 1
