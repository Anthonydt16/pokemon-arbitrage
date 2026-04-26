"""
Tests de scraper/price_reference.py
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from unittest.mock import patch
from price_reference import _is_sealed, _extract_pokemon_name, get_reference_price


# ── _is_sealed ────────────────────────────────────────────────────────────────

def test_is_sealed_etb():
    assert _is_sealed('ETB Évolutions Prismatiques scellé', []) is True


def test_is_sealed_display():
    assert _is_sealed('Display 36 boosters Pokémon Scarlet', []) is True


def test_not_sealed_single_card():
    assert _is_sealed('Dracaufeu VMAX 020/189 near mint', []) is False


def test_sealed_via_keyword():
    # Le keyword "coffret" déclenche le sealed
    assert _is_sealed('Gros lot Pokémon', ['coffret']) is True


# ── _extract_pokemon_name ─────────────────────────────────────────────────────

def test_extract_from_keywords():
    name = _extract_pokemon_name('Lot cartes Pokémon', ['dracaufeu', 'charizard'])
    # Les deux ont 9 chars — on accepte l'un ou l'autre
    assert name in ('dracaufeu', 'charizard')


def test_extract_fallback_title():
    name = _extract_pokemon_name('Pikachu VMAX ultra rare holo', [])
    assert name == 'Pikachu'


def test_extract_no_long_tokens():
    name = _extract_pokemon_name('lot de', [])
    assert name == ''


# ── get_reference_price ───────────────────────────────────────────────────────

def test_sealed_returns_median():
    result = get_reference_price('ETB scellé Pokémon Violet', [], scraped_median=80.0, scraped_count=15)
    assert result['source'] == 'median_local'
    assert result['reference_price'] == 80.0


def test_single_uses_tcgdex_when_higher():
    with patch('price_reference._get_tcgdex_price', return_value=120.0):
        result = get_reference_price('Dracaufeu VMAX 020/189', ['dracaufeu'], scraped_median=80.0, scraped_count=10)
    assert result['source'] == 'tcgdex_cardmarket'
    assert result['reference_price'] == 120.0
    assert result['confidence_boost'] is True


def test_single_keeps_median_when_consistent():
    with patch('price_reference._get_tcgdex_price', return_value=85.0):
        result = get_reference_price('Dracaufeu VMAX 020/189', ['dracaufeu'], scraped_median=80.0, scraped_count=25)
    # tcg_price (85) < median * 1.15 (92) → cohérent → médiane gardée
    assert result['source'] == 'median_local'
    assert result['confidence_boost'] is True


def test_no_tcgdex_result_stays_median():
    with patch('price_reference._get_tcgdex_price', return_value=None):
        result = get_reference_price('Ronflex holographique rare', ['ronflex'], scraped_median=30.0, scraped_count=8)
    assert result['source'] == 'median_local'
    assert result['warning'] is not None
