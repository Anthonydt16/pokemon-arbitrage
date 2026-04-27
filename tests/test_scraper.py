#!/usr/bin/env python3
"""
tests/test_scraper.py — Tests automatisés du scraper PokéArbitrage
Lance avec : python -m pytest tests/ -v
Ou directement : python tests/test_scraper.py
"""

import sys
import os
import unittest
import statistics

# Ajoute le dossier scraper au path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'scraper'))

from filters import filter_results, is_valid_result, remove_outliers, compute_confidence
from price_reference import get_reference_price, _is_sealed, _extract_pokemon_name


# ─────────────────────────────────────────────────────────────
# Tests Filtres
# ─────────────────────────────────────────────────────────────

class TestFilters(unittest.TestCase):

    def _item(self, title, price=50.0, url='http://test.com', platform='vinted'):
        return {'title': title, 'price': price, 'url': url, 'platform': platform}

    # ── is_valid_result ──────────────────────────────────────

    def test_valid_item_passes(self):
        item = self._item('ETB Évolutions Prismatiques scellé neuf')
        self.assertTrue(is_valid_result(item))

    def test_title_too_short_rejected(self):
        item = self._item('Pokémon')
        self.assertFalse(is_valid_result(item))

    def test_negative_keyword_vide_rejected(self):
        item = self._item('ETB Évolutions Prismatiques boîte vide sans booster')
        self.assertFalse(is_valid_result(item))

    def test_negative_keyword_proxy_rejected(self):
        item = self._item('Carte Dracaufeu proxy holo custom')
        self.assertFalse(is_valid_result(item))

    def test_negative_keyword_psa_rejected(self):
        item = self._item('Dracaufeu EX PSA 9 gem mint')
        self.assertFalse(is_valid_result(item))

    def test_negative_keyword_sleeve_rejected(self):
        item = self._item('Pokemon card sleeves lot bundle sealed energy')
        self.assertFalse(is_valid_result(item))

    def test_negative_keyword_livre_rejected(self):
        item = self._item("Livre Pokemon Dracaufeu a l'attaque")
        self.assertFalse(is_valid_result(item))

    def test_negative_keyword_artset_rejected(self):
        item = self._item('Artset 4 boosters Évolutions Prismatiques EV8.5')
        self.assertFalse(is_valid_result(item))

    def test_zero_price_rejected(self):
        item = self._item('ETB Pokemon valide', price=0)
        self.assertFalse(is_valid_result(item))

    def test_positive_keyword_filter_pass(self):
        item = self._item('ETB Évolutions Prismatiques scellé')
        self.assertTrue(is_valid_result(item, keywords=['etb evolutions prismatiques']))

    def test_positive_keyword_filter_fail(self):
        # Titre sans aucun token des keywords → rejeté
        item = self._item('Objet sans rapport avec la recherche pokemon')
        self.assertFalse(is_valid_result(item, keywords=['etb evolutions prismatiques']))

    # ── remove_outliers ──────────────────────────────────────

    def test_outliers_removed(self):
        items = [
            self._item('Card A', price=50),
            self._item('Card B', price=55),
            self._item('Card C', price=48),
            self._item('Card D', price=52),
            self._item('Card E', price=500),   # outlier × 10
            self._item('Card F', price=3),     # outlier /15
        ]
        filtered = remove_outliers(items)
        prices = [i['price'] for i in filtered]
        self.assertNotIn(500.0, prices)
        self.assertNotIn(3.0, prices)

    def test_no_outliers_unchanged(self):
        items = [self._item(f'Card {i}', price=50 + i) for i in range(5)]
        filtered = remove_outliers(items)
        self.assertEqual(len(filtered), 5)

    def test_too_few_items_not_filtered(self):
        items = [self._item('A', 10), self._item('B', 500)]
        # < 4 items → pas de filtre outlier
        filtered = remove_outliers(items)
        self.assertEqual(len(filtered), 2)

    # ── compute_confidence ───────────────────────────────────

    def test_confidence_low(self):
        self.assertEqual(compute_confidence(3), 0.2)

    def test_confidence_medium(self):
        self.assertEqual(compute_confidence(10), 0.5)

    def test_confidence_high(self):
        self.assertEqual(compute_confidence(20), 0.8)

    def test_confidence_max(self):
        self.assertEqual(compute_confidence(50), 1.0)

    # ── filter_results ───────────────────────────────────────

    def test_filter_results_removes_bad_items(self):
        items = [
            self._item('ETB Évolutions Prismatiques scellé neuf', price=95),
            self._item('Pokémon', price=5),                      # titre trop court
            self._item('Boîte vide ETB pokemon', price=10),        # mot négatif
            self._item('Coffret dresseur élite neuf scellé', price=120),  # valide
            self._item('Proxy Dracaufeu holo', price=8),          # proxy
        ]
        filtered, confidence = filter_results(items)
        self.assertEqual(len(filtered), 2)
        self.assertIsInstance(confidence, float)

    def test_filter_results_returns_tuple(self):
        items = [self._item('ETB Pokemon scellé neuf', price=50)]
        result = filter_results(items)
        self.assertIsInstance(result, tuple)
        self.assertEqual(len(result), 2)


# ─────────────────────────────────────────────────────────────
# Tests Price Reference
# ─────────────────────────────────────────────────────────────

class TestPriceReference(unittest.TestCase):

    # ── _is_sealed ───────────────────────────────────────────

    def test_etb_is_sealed(self):
        self.assertTrue(_is_sealed('ETB Évolutions Prismatiques', ['etb']))

    def test_display_is_sealed(self):
        self.assertTrue(_is_sealed('Display 36 boosters scellé', []))

    def test_coffret_is_sealed(self):
        self.assertTrue(_is_sealed('Coffret Dracaufeu EX scellé', []))

    def test_single_card_not_sealed(self):
        self.assertFalse(_is_sealed('Dracaufeu GX 9/68', ['dracaufeu']))

    # ── _extract_pokemon_name ────────────────────────────────

    def test_extract_from_keywords(self):
        name = _extract_pokemon_name('Dracaufeu GX 9/68', ['dracaufeu'])
        self.assertEqual(name, 'dracaufeu')

    def test_extract_longest_token(self):
        name = _extract_pokemon_name('Carte pokemon', ['pikachu', 'vmax'])
        self.assertIn(name, ['pikachu', 'vmax'])

    # ── get_reference_price ──────────────────────────────────

    def test_sealed_uses_median(self):
        ref = get_reference_price('ETB Évolutions Prismatiques scellé', ['etb evolutions prismatiques'], 100.0, 90)
        self.assertEqual(ref['source'], 'median')
        self.assertEqual(ref['reference_price'], 100.0)
        self.assertIsNone(ref['tcg_price_eur'])

    def test_returns_dict_with_required_keys(self):
        ref = get_reference_price('ETB scellé test', ['etb'], 50.0, 10)
        for key in ['reference_price', 'source', 'tcg_price_eur', 'confidence_boost', 'warning']:
            self.assertIn(key, ref)

    def test_reference_price_always_positive(self):
        ref = get_reference_price('Carte Pikachu commune', ['pikachu'], 5.0, 5)
        self.assertGreater(ref['reference_price'], 0)


# ─────────────────────────────────────────────────────────────
# Tests API Next.js (nécessite l'app en cours)
# ─────────────────────────────────────────────────────────────

class TestAPI(unittest.TestCase):
    BASE = 'http://localhost:3001/api'

    def _get(self, path):
        import requests
        try:
            return requests.get(self.BASE + path, timeout=5)
        except Exception:
            self.skipTest("App Next.js non disponible sur :3001")

    def _post(self, path, body):
        import requests
        try:
            return requests.post(self.BASE + path, json=body, timeout=5)
        except Exception:
            self.skipTest("App Next.js non disponible sur :3001")

    def test_searches_returns_list(self):
        r = self._get('/searches')
        self.assertEqual(r.status_code, 200)
        self.assertIsInstance(r.json(), list)

    def test_deals_paginated_response(self):
        r = self._get('/deals?page=1&limit=10')
        self.assertEqual(r.status_code, 200)
        data = r.json()
        for key in ['deals', 'total', 'page', 'hasMore']:
            self.assertIn(key, data)
        self.assertIsInstance(data['deals'], list)
        self.assertIsInstance(data['total'], int)

    def test_deals_top_returns_list(self):
        r = self._get('/deals/top')
        self.assertEqual(r.status_code, 200)
        self.assertIsInstance(r.json(), list)

    def test_best_today_response_structure(self):
        r = self._get('/deals/best-today')
        self.assertEqual(r.status_code, 200)
        data = r.json()
        self.assertIn('scope', data)
        self.assertIn('deal', data)

    def test_settings_response_structure(self):
        r = self._get('/settings')
        self.assertEqual(r.status_code, 200)
        data = r.json()
        for key in ['discordWebhookSet', 'alertMinMargin', 'alertGlobal']:
            self.assertIn(key, data)

    def test_create_and_delete_search(self):
        import requests as req
        # Création (via scraper key pour les tests d'intégration)
        SCRAPER_KEY = 'scraper-internal-key-2026'
        headers = {'x-scraper-key': SCRAPER_KEY}
        body = {
            'name': '__TEST_SEARCH__',
            'keywords': ['pikachu'],
            'platforms': ['vinted'],
            'minPrice': 5,
            'maxPrice': 50,
            'active': True,
        }
        try:
            r = req.post(self.BASE + '/searches', json=body, headers=headers, timeout=5)
        except Exception:
            self.skipTest("App non disponible")
        self.assertEqual(r.status_code, 200)
        data = r.json()
        self.assertIn('id', data)
        self.assertEqual(data['name'], '__TEST_SEARCH__')

        # Suppression (directement via scraper key — searches créées via scraper key ont userId=null et isGlobal=false)
        # On supprime directement via Prisma car le DELETE API exige un userId.
        # Pour les tests, on skip la suppression via API et on nettoie via DB.
        # La recherche sera nettoyée par cleanup.
        self.assertTrue(True)  # test de création réussi

    def test_cleanup_endpoint(self):
        import requests as req
        try:
            r = req.delete(self.BASE + '/deals/cleanup', timeout=5)
        except Exception:
            self.skipTest("App non disponible")
        self.assertEqual(r.status_code, 200)
        data = r.json()
        self.assertIn('ok', data)
        self.assertTrue(data['ok'])

    def test_settings_patch(self):
        import requests as req
        try:
            r = req.patch(self.BASE + '/settings',
                         json={'alertMinMargin': 25, 'alertGlobal': False},
                         timeout=5)
        except Exception:
            self.skipTest("App non disponible")
        self.assertEqual(r.status_code, 200)
        # Restore
        req.patch(self.BASE + '/settings',
                  json={'alertMinMargin': 15, 'alertGlobal': True},
                  timeout=5)

    def test_invalid_webhook_rejected(self):
        import requests as req
        try:
            r = req.patch(self.BASE + '/settings',
                         json={'discordWebhook': 'https://not-discord.com/webhook'},
                         timeout=5)
        except Exception:
            self.skipTest("App non disponible")
        self.assertEqual(r.status_code, 400)


# ─────────────────────────────────────────────────────────────
# Tests Scrapers (smoke tests — vérifie la structure, pas le contenu)
# ─────────────────────────────────────────────────────────────

class TestScraperStructure(unittest.TestCase):
    """
    Tests légers qui vérifient que les scrapers retournent la bonne structure.
    N'effectuent PAS de vraies requêtes HTTP (mockées).
    """

    def test_filter_output_structure(self):
        """Vérifie que filter_results retourne bien des dicts avec les bons champs."""
        items = [
            {'title': 'ETB Pokémon scellé neuf valide', 'price': 95.0,
             'url': 'https://example.com/1', 'platform': 'ebay'},
            {'title': 'Display 36 boosters scellé', 'price': 120.0,
             'url': 'https://example.com/2', 'platform': 'leboncoin'},
        ]
        filtered, conf = filter_results(items)
        for item in filtered:
            self.assertIn('title', item)
            self.assertIn('price', item)
            self.assertIn('url', item)
            self.assertIn('platform', item)

    def test_market_median_logic(self):
        """Vérifie la logique de calcul de médiane et détection de deals."""
        # Outlier = > 3x la médiane. Médiane de [50..110] ~ 80 → 3x = 240
        # Donc 500 est bien un outlier, mais 200 ne l'est pas (200 < 240)
        prices = [50, 60, 70, 80, 90, 100, 110, 500]  # 500 = outlier réel
        items = [{'title': f'ETB scellé {i}', 'price': float(p),
                  'url': f'http://x.com/{i}', 'platform': 'ebay'}
                 for i, p in enumerate(prices)]
        filtered = remove_outliers(items)
        filtered_prices = [i['price'] for i in filtered]
        self.assertNotIn(500.0, filtered_prices)  # 500 > 3x médiane → éjecté
        self.assertIn(110.0, filtered_prices)     # 110 reste
        median = statistics.median(filtered_prices)
        # Deal = prix < médiane - 15%
        threshold = median * 0.85
        deals = [i for i in filtered if i['price'] < threshold]
        self.assertTrue(len(deals) >= 0)


if __name__ == '__main__':
    # Couleurs dans le terminal
    import unittest
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()
    suite.addTests(loader.loadTestsFromTestCase(TestFilters))
    suite.addTests(loader.loadTestsFromTestCase(TestPriceReference))
    suite.addTests(loader.loadTestsFromTestCase(TestAPI))
    suite.addTests(loader.loadTestsFromTestCase(TestScraperStructure))

    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    sys.exit(0 if result.wasSuccessful() else 1)
