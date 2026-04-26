"""
Tests de scraper/filters.py
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from filters import is_valid_result, remove_outliers, compute_confidence, filter_results, is_foreign_card


def make_item(title, price=50):
    return {'title': title, 'price': price}


# ── is_valid_result ───────────────────────────────────────────────────────────

def test_valid_item_passes():
    item = make_item('ETB Évolutions Prismatiques scellé neuf')
    assert is_valid_result(item) is True


def test_negative_keyword_rejected():
    item = make_item('Boîte vide ETB Pokémon pas de boosters')
    assert is_valid_result(item) is False


def test_price_zero_rejected():
    item = make_item('Display Pokémon Scarlet neuf scellé', price=0)
    assert is_valid_result(item) is False


def test_title_too_short_rejected():
    item = make_item('ETB', price=50)
    assert is_valid_result(item) is False


def test_required_keyword_filter():
    item = make_item('Coffret cadeau anniversaire Pokémon XY', price=30)
    # keyword 'dracaufeu' → token 'dracaufeu' absent du titre
    assert is_valid_result(item, keywords=['dracaufeu']) is False


def test_required_keyword_match():
    item = make_item('Dracaufeu VMAX full art Pokémon ultra rare', price=80)
    assert is_valid_result(item, keywords=['dracaufeu']) is True


# ── remove_outliers ───────────────────────────────────────────────────────────

def test_outliers_removed():
    items = [
        make_item('Deal A', 50), make_item('Deal B', 55),
        make_item('Deal C', 48), make_item('Deal D', 52),
        make_item('Deal E', 5000),  # outlier
    ]
    result = remove_outliers(items)
    prices = [r['price'] for r in result]
    assert 5000 not in prices


def test_no_outliers_when_too_few():
    items = [make_item('A', 50), make_item('B', 5000)]
    result = remove_outliers(items)
    assert len(result) == 2  # < 4 items → pas de filtre


# ── compute_confidence ────────────────────────────────────────────────────────

def test_confidence_low():
    assert compute_confidence(3) == 0.2


def test_confidence_medium():
    assert compute_confidence(10) == 0.5


def test_confidence_high():
    assert compute_confidence(30) == 1.0


# ── filter_results ────────────────────────────────────────────────────────────

def test_filter_results_returns_tuple():
    items = [make_item('ETB Pokémon Scarlet scellé neuf', 60)]
    result, confidence = filter_results(items, keywords=['pokémon'])
    assert isinstance(result, list)
    assert 0 <= confidence <= 1


def test_filter_results_removes_negatives():
    items = [
        make_item('ETB Pokémon scellé neuf Scarlet Violet', 60),
        make_item('Boîte vide ETB Pokémon sans boosters', 10),
    ]
    result, _ = filter_results(items)
    assert len(result) == 1


# ── is_foreign_card / lang_filter ────────────────────────────────────────────────────

def test_is_foreign_card_jap():
    assert is_foreign_card('Dracaufeu VMAX jap mint') is True


def test_is_foreign_card_japanese():
    assert is_foreign_card('Pikachu V japanese holo') is True


def test_is_foreign_card_english():
    assert is_foreign_card('Mewtwo GX english rare') is True


def test_is_foreign_card_en_parenthesis():
    assert is_foreign_card('Ronflex (EN) rare holo') is True


def test_is_foreign_card_katakana():
    # Katakana ピカチュウ = Pikachu en japonais
    assert is_foreign_card('ピカチュウ VMAX rare') is True


def test_is_foreign_card_hiragana():
    assert is_foreign_card('ぴかちゅう promo card') is True


def test_is_foreign_card_french_ok():
    assert is_foreign_card('Dracaufeu VMAX alt art français neuf') is False


def test_lang_filter_removes_foreign_in_filter_results():
    items = [
        make_item('ETB Pokémon Scarlet Violet scellé neuf', 60),
        make_item('Display jap Pokémon Scarlet Violet neuf', 55),
        make_item('Dracaufeu VMAX japanese rare mint', 80),
    ]
    result, _ = filter_results(items, lang_filter=True)
    titles = [r['title'] for r in result]
    assert all('jap' not in t.lower() and 'japanese' not in t.lower() for t in titles)
    assert len(result) == 1  # seul l'ETB FR reste
