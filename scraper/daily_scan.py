#!/usr/bin/env python3
"""
daily_scan.py — Scan quotidien à 12h sur le catalogue global Pokémon
Avec : filtres qualité, score confiance, alertes Discord, résumé quotidien
"""

import sqlite3, json, requests, schedule, time, os, sys, statistics
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(__file__))

from scrapers.leboncoin import scrape as scrape_lbc
from scrapers.vinted import scrape as scrape_vinted
from scrapers.ebay import scrape as scrape_ebay
from filters import filter_results, is_sealed_product
from notifier import send_deal_alert, send_daily_summary
from price_reference import get_reference_price
from trust_score import compute_trust
from product_detector import detect_product, group_by_product

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'prisma', 'dev.db')
API_BASE = os.environ.get('API_BASE', 'http://localhost:3001/api')
DEAL_THRESHOLD_PCT = 15

GLOBAL_CATALOG = [
    # ── ETB (Elite Trainer Box) ──────────────────────────────
    # keywords = termes de recherche | title_must_contain = au moins 1 doit être dans le titre
    {'name': 'ETB Évolutions Prismatiques',   'keywords': ['etb evolutions prismatiques', 'ev8.5'],       'title_must_contain': ['evolutions prismatiques', 'ev8.5'],                      'platforms': ['leboncoin', 'vinted', 'ebay'], 'minPrice': 30,  'maxPrice': 220},
    {'name': 'ETB Aventures Ensemble',          'keywords': ['etb aventures ensemble', 'ev9'],               'title_must_contain': ['aventures ensemble', 'ev9', 'ev09'],                     'platforms': ['leboncoin', 'vinted', 'ebay'], 'minPrice': 25,  'maxPrice': 120},
    {'name': 'ETB Equilibre Parfait',           'keywords': ['etb equilibre parfait', 'ev10'],               'title_must_contain': ['equilibre parfait', 'ev10'],                             'platforms': ['leboncoin', 'vinted', 'ebay'], 'minPrice': 25,  'maxPrice': 130},
    {'name': 'ETB Écarlate et Violet Base',     'keywords': ['etb ecarlate violet sv1'],                     'title_must_contain': ['ecarlate violet', 'sv1'],                                'platforms': ['leboncoin', 'vinted', 'ebay'], 'minPrice': 15,  'maxPrice': 80},
    {'name': 'ETB Destinées de Paldea',         'keywords': ['etb destinees paldea', 'ev4.5'],              'title_must_contain': ['destinees paldea', 'destinées paldea', 'ev4.5'],          'platforms': ['leboncoin', 'vinted', 'ebay'], 'minPrice': 20,  'maxPrice': 100},
    {'name': 'ETB Mascarade Crépusculaire',     'keywords': ['etb mascarade crepusculaire', 'ev6.5'],       'title_must_contain': ['mascarade', 'ev6.5'],                                     'platforms': ['leboncoin', 'vinted', 'ebay'], 'minPrice': 25,  'maxPrice': 130},
    {'name': 'ETB Failles Paradoxales',         'keywords': ['etb failles paradoxales', 'ev4 pokemon'],     'title_must_contain': ['failles paradoxales', 'ev4'],                            'platforms': ['leboncoin', 'vinted', 'ebay'], 'minPrice': 20,  'maxPrice': 100},
    {'name': 'ETB Couronne Stellaire',          'keywords': ['etb couronne stellaire', 'ev7 pokemon'],      'title_must_contain': ['couronne stellaire', 'ev7'],                              'platforms': ['leboncoin', 'vinted', 'ebay'], 'minPrice': 25,  'maxPrice': 120},
    {'name': 'ETB Forces Temporelles',          'keywords': ['etb forces temporelles', 'ev5 pokemon'],      'title_must_contain': ['forces temporelles', 'ev5'],                             'platforms': ['leboncoin', 'vinted', 'ebay'], 'minPrice': 20,  'maxPrice': 100},
    {'name': 'ETB Flammes Obsidiennes',         'keywords': ['etb flammes obsidiennes', 'ev3 pokemon'],     'title_must_contain': ['flammes obsidiennes', 'ev3'],                            'platforms': ['leboncoin', 'vinted', 'ebay'], 'minPrice': 20,  'maxPrice': 100},
    {'name': 'ETB Pokémon 151',                 'keywords': ['etb pokemon 151', 'ev3.5 pokemon'],           'title_must_contain': ['pokemon 151', '151', 'ev3.5'],                           'platforms': ['leboncoin', 'vinted', 'ebay'], 'minPrice': 30,  'maxPrice': 150},
    {'name': 'ETB Méga-Évolution ME01',         'keywords': ['etb mega evolution me01 pokemon'],             'title_must_contain': ['mega evolution', 'me01', 'me1'],                          'platforms': ['leboncoin', 'vinted', 'ebay'], 'minPrice': 40,  'maxPrice': 200},
    {'name': 'ETB Méga-Flamme ME02',             'keywords': ['etb mega flamme me02 pokemon'],                'title_must_contain': ['mega flamme', 'me02', 'me2'],                             'platforms': ['leboncoin', 'vinted', 'ebay'], 'minPrice': 35,  'maxPrice': 180},
    # ── Display (36 boosters) ────────────────────────
    {'name': 'Display Évolutions Prismatiques',  'keywords': ['display evolutions prismatiques ev8.5'],      'title_must_contain': ['evolutions prismatiques', 'ev8.5'],                      'platforms': ['leboncoin', 'vinted', 'ebay'], 'minPrice': 100, 'maxPrice': 500},
    {'name': 'Display Destinées de Paldea',      'keywords': ['display destinees paldea ev4.5'],             'title_must_contain': ['destinees paldea', 'destinées paldea', 'ev4.5'],          'platforms': ['leboncoin', 'vinted', 'ebay'], 'minPrice': 60,  'maxPrice': 300},
    {'name': 'Display Pokémon 151',              'keywords': ['display pokemon 151 ev3.5'],                   'title_must_contain': ['pokemon 151', '151', 'ev3.5'],                           'platforms': ['leboncoin', 'vinted', 'ebay'], 'minPrice': 80,  'maxPrice': 400},
    {'name': 'Display Couronne Stellaire',      'keywords': ['display couronne stellaire ev7'],             'title_must_contain': ['couronne stellaire', 'ev7'],                              'platforms': ['leboncoin', 'vinted', 'ebay'], 'minPrice': 60,  'maxPrice': 250},
    {'name': 'Display Failles Paradoxales',     'keywords': ['display failles paradoxales ev4'],            'title_must_contain': ['failles paradoxales', 'ev4'],                            'platforms': ['leboncoin', 'vinted', 'ebay'], 'minPrice': 60,  'maxPrice': 250},
    {'name': 'Display Forces Temporelles',      'keywords': ['display forces temporelles ev5'],             'title_must_contain': ['forces temporelles', 'ev5'],                             'platforms': ['leboncoin', 'vinted', 'ebay'], 'minPrice': 60,  'maxPrice': 250},
    # ── Coffrets Premium ─────────────────────────────────
    {'name': 'Coffret Ultra Premium Dracaufeu', 'keywords': ['ultra premium collection dracaufeu upc'],     'title_must_contain': ['ultra premium', 'upc'],                                  'platforms': ['leboncoin', 'vinted', 'ebay'], 'minPrice': 80,  'maxPrice': 400},
    {'name': 'Coffret Ultra Premium Pikachu',   'keywords': ['ultra premium collection pikachu upc'],       'title_must_contain': ['ultra premium', 'upc'],                                  'platforms': ['leboncoin', 'vinted', 'ebay'], 'minPrice': 60,  'maxPrice': 300},
    {'name': 'Coffret Ultra Premium Mewtwo',    'keywords': ['ultra premium collection mewtwo upc'],        'title_must_contain': ['ultra premium', 'upc'],                                  'platforms': ['leboncoin', 'vinted', 'ebay'], 'minPrice': 60,  'maxPrice': 300},
    {'name': 'Booster Évolutions Prismatiques',  'keywords': ['booster evolutions prismatiques ev8.5'],      'title_must_contain': ['evolutions prismatiques', 'ev8.5'],                      'platforms': ['leboncoin', 'vinted', 'ebay'], 'minPrice': 4,   'maxPrice': 30},
    {'name': 'Lot boosters scellés',             'keywords': ['lot boosters pokemon scelle neuf'],            'title_must_contain': ['lot', 'boosters'],                                        'platforms': ['leboncoin', 'vinted', 'ebay'], 'minPrice': 10,  'maxPrice': 200},
]


def get_or_create_search(name, keywords, platforms, min_p, max_p):
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()
        cur.execute("SELECT id FROM Search WHERE name = ? AND isGlobal = 1", (name,))
        row = cur.fetchone()
        conn.close()
        if row:
            return row['id']
        r = requests.post(f"{API_BASE}/searches", json={
            'name': name, 'keywords': keywords, 'platforms': platforms,
            'minPrice': min_p, 'maxPrice': max_p, 'active': True, 'isGlobal': True,
        }, timeout=10)
        return r.json()['id'] if r.status_code == 200 else None
    except Exception as e:
        print(f"  [DB] get_or_create: {e}")
        return None


def update_stats(search_id, avg):
    try:
        conn = sqlite3.connect(DB_PATH)
        cur = conn.cursor()
        cur.execute("UPDATE Search SET lastAvgPrice=?, lastScrapeAt=? WHERE id=?",
                    (avg, datetime.now(timezone.utc).isoformat(), search_id))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"  [DB] {e}")


def save_deal_with_retry(search_id, deal, median, margin, max_retries=3):
    for attempt in range(1, max_retries + 1):
        if save_deal(search_id, deal, median, margin):
            return True
        print(f"  [API] Retry {attempt}/{max_retries}...")
        time.sleep(attempt)
    return False


def save_deal(search_id, deal, median, margin):
    try:
        r = requests.post(f"{API_BASE}/deals", json={
            'searchId': search_id, 'title': deal['title'], 'price': deal['price'],
            'url': deal['url'], 'platform': deal['platform'],
            'imageUrl': deal.get('imageUrl'), 'cardMarketPrice': round(median, 2),
            'margin': round(margin, 1), 'location': deal.get('location'),
            'trustScore': deal.get('trustScore'),
            'trustLevel': deal.get('trustLevel'),
            'trustFlags': deal.get('trustFlags'),
            'photoCount': deal.get('photoCount'),
            'isPro': deal.get('isPro'),
        }, timeout=10)
        return r.status_code == 200
    except requests.exceptions.ConnectionError:
        print(f"  [API] App Next.js inaccessible")
        return False


def compute_stats(results):
    prices = [r['price'] for r in results if r['price'] > 0]
    if not prices:
        return None
    median = statistics.median(prices)
    filtered = [p for p in prices if 0.2 * median <= p <= 3 * median]
    if not filtered:
        filtered = prices
    return {
        'avg': round(statistics.mean(filtered), 2),
        'median': round(statistics.median(filtered), 2),
        'min': round(min(filtered), 2),
        'max': round(max(filtered), 2),
        'count': len(filtered),
    }


def run_daily_scan():
    # Cleanup auto
    try:
        requests.delete(f"{API_BASE}/deals/cleanup", timeout=5)
    except Exception:
        pass

    print(f"\n{'='*60}")
    print(f"  🗓  SCAN QUOTIDIEN — {datetime.now().strftime('%d/%m/%Y %H:%M')}")
    print(f"  {len(GLOBAL_CATALOG)} produits")
    print(f"{'='*60}\n")

    total_deals = 0

    for item in GLOBAL_CATALOG:
        name = item['name']
        kw = item['keywords']
        platforms = item['platforms']
        min_p, max_p = item['minPrice'], item['maxPrice']

        print(f"🔍 {name}  ({min_p}€→{max_p}€)")

        search_id = get_or_create_search(name, kw, platforms, min_p, max_p)
        if not search_id:
            print("  ⚠️  Impossible de créer la recherche\n")
            continue

        # Scrape
        raw = []
        if 'leboncoin' in platforms:
            raw.extend(scrape_lbc(kw, min_p, max_p))
            time.sleep(1.5)
        if 'vinted' in platforms:
            raw.extend(scrape_vinted(kw, min_p, max_p))
            time.sleep(1.5)
        if 'ebay' in platforms:
            raw.extend(scrape_ebay(kw, min_p, max_p))
            time.sleep(1.5)

        # Déduplique
        seen, unique = set(), []
        for r in raw:
            if r['url'] not in seen:
                seen.add(r['url'])
                unique.append(r)

        # Filtre qualité
        results, confidence = filter_results(unique, kw, lang_filter=True)

        # Filtre produits scellés uniquement (ETB, display, coffret…)
        # Évite que des cartes singles ou accessoires glissent dans les deals globaux
        before_sealed = len(results)
        results = [r for r in results if is_sealed_product(r['title'])]
        removed_sealed = before_sealed - len(results)
        if removed_sealed:
            print(f"  [Filtre] -{removed_sealed} non-scellés (cartes singles, accessoires…)")

        # Filtre titre strict — l'annonce doit correspondre AU produit cherché
        must_contain = item.get('title_must_contain', [])
        if must_contain:
            before_strict = len(results)
            results = [r for r in results if any(m in r['title'].lower() for m in must_contain)]
            removed_strict = before_strict - len(results)
            if removed_strict:
                print(f"  [Filtre] -{removed_strict} mauvais produit (ex: autre ETB)")

        if not results:
            print("  → Aucun résultat valide\n")
            continue

        # Groupe par produit détecté pour médiane per-produit
        groups = group_by_product(results)
        detected = [k for k in groups if k != 'unknown']
        print(f"  📦 {len(groups)} produit(s) détecté(s) : {', '.join(detected) if detected else 'aucun'}")

        deals_found = 0
        for product_name, product_items in groups.items():
            if product_name == 'unknown':
                continue  # Skip les non-identifiés

            stats = compute_stats(product_items)
            if not stats or stats['count'] < 3:
                continue  # Pas assez d'annonces pour une médiane fiable

            median = stats['median']
            update_stats(search_id, stats['avg'])
            print(f"  📊 [{product_name}] {stats['count']} annonces | méd {median}€")

            for res in sorted(product_items, key=lambda x: x['price']):
                ref = get_reference_price(res['title'], kw, median, stats['count'])
                ref_price = ref['reference_price']
                margin = ((ref_price - res['price']) / ref_price) * 100
                if margin < DEAL_THRESHOLD_PCT:
                    continue
                trust = compute_trust(res, median, kw)
                res['trustScore'] = trust['score']
                res['trustLevel'] = trust['level']
                res['trustFlags'] = json.dumps(trust['flags'], ensure_ascii=False)
                if save_deal_with_retry(search_id, res, ref_price, margin):
                    deals_found += 1
                    total_deals += 1
                    emoji = '🔥' if margin >= 35 else '✅'
                    print(f"    {emoji} {res['price']}€ (-{margin:.0f}%) — {res['title'][:55]} [{res['platform']}]")
                    send_deal_alert(res, product_name, ref_price, margin, 1.0, is_global=True)

        if not deals_found:
            best = sorted(results, key=lambda x: x['price'])
            if best:
                b = best[0]
                print(f"  → Meilleur prix: {b['price']}€ — {b['title'][:55]}")
        print()

    print(f"{'='*60}")
    print(f"  ✅ {total_deals} deal(s). Prochains scans à 08h, 13h, 19h.")
    print(f"{'='*60}\n")

    send_daily_summary(total_deals, len(GLOBAL_CATALOG))


if __name__ == '__main__':
    print("🃏 PokéArbitrage — Scan quotidien")
    print(f"   Discord : {'configuré' if os.environ.get('DISCORD_WEBHOOK_URL') else 'non configuré (optionnel)'}\n")
    run_daily_scan()
    schedule.every().day.at("08:00").do(run_daily_scan)
    schedule.every().day.at("13:00").do(run_daily_scan)
    schedule.every().day.at("19:00").do(run_daily_scan)
    while True:
        schedule.run_pending()
        time.sleep(60)
