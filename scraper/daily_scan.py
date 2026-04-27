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
from trust_score import compute_trust, _detect_product_type, _normalize

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'prisma', 'dev.db')
API_BASE = os.environ.get('API_BASE', 'http://localhost:3001/api')
DEAL_THRESHOLD_PCT = 15

GLOBAL_CATALOG = [
    # ── ETB (Elite Trainer Box) ──────────────────────────────
    {'name': 'ETB Évolutions Prismatiques', 'keywords': ['etb evolutions prismatiques', 'coffret dresseur elite ev8.5'], 'platforms': ['leboncoin', 'vinted', 'ebay'], 'minPrice': 30, 'maxPrice': 220},
    {'name': 'ETB Écarlate et Violet Base', 'keywords': ['etb ecarlate violet base', 'coffret dresseur elite sv1'], 'platforms': ['leboncoin', 'vinted', 'ebay'], 'minPrice': 15, 'maxPrice': 80},
    {'name': 'ETB Destinées de Paldea', 'keywords': ['etb destinees paldea', 'coffret dresseur ev4.5'], 'platforms': ['leboncoin', 'vinted', 'ebay'], 'minPrice': 20, 'maxPrice': 100},
    {'name': 'ETB Mascarade Crépusculaire', 'keywords': ['etb mascarade crepusculaire', 'coffret dresseur ev6.5'], 'platforms': ['leboncoin', 'vinted', 'ebay'], 'minPrice': 25, 'maxPrice': 130},
    {'name': 'ETB Failles Paradoxales', 'keywords': ['etb failles paradoxales', 'coffret dresseur ev4'], 'platforms': ['leboncoin', 'vinted', 'ebay'], 'minPrice': 20, 'maxPrice': 100},
    {'name': 'ETB Couronne Stellaire', 'keywords': ['etb couronne stellaire', 'coffret dresseur ev7'], 'platforms': ['leboncoin', 'vinted', 'ebay'], 'minPrice': 25, 'maxPrice': 120},
    {'name': 'ETB Forces Temporelles', 'keywords': ['etb forces temporelles', 'coffret dresseur ev5'], 'platforms': ['leboncoin', 'vinted', 'ebay'], 'minPrice': 20, 'maxPrice': 100},
    {'name': 'ETB Flammes Obsidiennes', 'keywords': ['etb flammes obsidiennes', 'coffret dresseur ev3'], 'platforms': ['leboncoin', 'vinted', 'ebay'], 'minPrice': 20, 'maxPrice': 100},
    {'name': 'ETB Pokémon 151', 'keywords': ['etb pokemon 151', 'coffret dresseur ev3.5'], 'platforms': ['leboncoin', 'vinted', 'ebay'], 'minPrice': 30, 'maxPrice': 150},
    {'name': 'ETB Évolutions à Paldea', 'keywords': ['etb evolutions paldea', 'coffret dresseur sv2'], 'platforms': ['leboncoin', 'vinted', 'ebay'], 'minPrice': 20, 'maxPrice': 90},
    # ── Display (36 boosters) ────────────────────────────────
    {'name': 'Display Évolutions Prismatiques', 'keywords': ['display evolutions prismatiques', '36 boosters ev8.5 pokemon'], 'platforms': ['leboncoin', 'vinted', 'ebay'], 'minPrice': 100, 'maxPrice': 500},
    {'name': 'Display Destinées de Paldea', 'keywords': ['display destinees paldea', '36 boosters ev4.5'], 'platforms': ['leboncoin', 'vinted', 'ebay'], 'minPrice': 60, 'maxPrice': 300},
    {'name': 'Display Pokémon 151', 'keywords': ['display pokemon 151', '36 boosters ev3.5 151'], 'platforms': ['leboncoin', 'vinted', 'ebay'], 'minPrice': 80, 'maxPrice': 400},
    {'name': 'Display Couronne Stellaire', 'keywords': ['display couronne stellaire', '36 boosters ev7 pokemon'], 'platforms': ['leboncoin', 'vinted', 'ebay'], 'minPrice': 60, 'maxPrice': 250},
    {'name': 'Display Failles Paradoxales', 'keywords': ['display failles paradoxales', '36 boosters ev4 pokemon'], 'platforms': ['leboncoin', 'vinted', 'ebay'], 'minPrice': 60, 'maxPrice': 250},
    {'name': 'Display Forces Temporelles', 'keywords': ['display forces temporelles', '36 boosters ev5 pokemon'], 'platforms': ['leboncoin', 'vinted', 'ebay'], 'minPrice': 60, 'maxPrice': 250},
    # ── Coffrets Premium ─────────────────────────────────────
    {'name': 'Coffret Ultra Premium Dracaufeu', 'keywords': ['ultra premium collection dracaufeu', 'upc charizard pokemon'], 'platforms': ['leboncoin', 'vinted', 'ebay'], 'minPrice': 80, 'maxPrice': 400},
    {'name': 'Coffret Ultra Premium Pikachu', 'keywords': ['ultra premium collection pikachu', 'upc pikachu pokemon'], 'platforms': ['leboncoin', 'vinted', 'ebay'], 'minPrice': 60, 'maxPrice': 300},
    {'name': 'Coffret Ultra Premium Mewtwo', 'keywords': ['ultra premium collection mewtwo', 'upc mewtwo pokemon'], 'platforms': ['leboncoin', 'vinted', 'ebay'], 'minPrice': 60, 'maxPrice': 300},
    {'name': 'Coffret Dracaufeu EX', 'keywords': ['coffret dracaufeu ex pokemon scelle'], 'platforms': ['leboncoin', 'vinted', 'ebay'], 'minPrice': 15, 'maxPrice': 80},
    {'name': 'Coffret Pokémon 151 Collection', 'keywords': ['coffret collection pokemon 151 scelle'], 'platforms': ['leboncoin', 'vinted', 'ebay'], 'minPrice': 20, 'maxPrice': 150},
    # ── Boosters à l'unité & petits lots ─────────────────────
    {'name': 'Booster Évolutions Prismatiques', 'keywords': ['booster evolutions prismatiques', 'booster ev8.5 pokemon scelle'], 'platforms': ['leboncoin', 'vinted', 'ebay'], 'minPrice': 4, 'maxPrice': 30},
    {'name': 'Lot boosters scellés Pokémon', 'keywords': ['lot boosters pokemon scelle neuf'], 'platforms': ['leboncoin', 'vinted', 'ebay'], 'minPrice': 10, 'maxPrice': 200},
    # ── Tripack (blister 3 boosters) ─────────────────────────
    {'name': 'Tripack Flammes Obsidiennes',       'keywords': ['tripack flammes obsidiennes', 'blister 3 boosters ev3'],     'platforms': ['leboncoin', 'vinted', 'ebay'], 'minPrice': 8,  'maxPrice': 40},
    {'name': 'Tripack Évolutions Prismatiques',   'keywords': ['tripack evolutions prismatiques', 'blister 3 boosters ev8.5'], 'platforms': ['leboncoin', 'vinted', 'ebay'], 'minPrice': 10, 'maxPrice': 50},
    {'name': 'Tripack Pokémon 151',               'keywords': ['tripack pokemon 151', 'blister 3 boosters ev3.5'],            'platforms': ['leboncoin', 'vinted', 'ebay'], 'minPrice': 10, 'maxPrice': 50},
    {'name': 'Tripack Destinées de Paldea',       'keywords': ['tripack destinees paldea', 'blister 3 boosters ev4.5'],      'platforms': ['leboncoin', 'vinted', 'ebay'], 'minPrice': 8,  'maxPrice': 35},
    {'name': 'Tripack Couronne Stellaire',        'keywords': ['tripack couronne stellaire', 'blister 3 boosters ev7'],      'platforms': ['leboncoin', 'vinted', 'ebay'], 'minPrice': 8,  'maxPrice': 35},
    {'name': 'Tripack Forces Temporelles',        'keywords': ['tripack forces temporelles', 'blister 3 boosters ev5'],      'platforms': ['leboncoin', 'vinted', 'ebay'], 'minPrice': 8,  'maxPrice': 35},
    # ── Cartes rares singles — EXCLUS du scan global (faussent la médiane) ──
    # Singles à gérer dans les recherches personnalisées uniquement
    # {'name': 'Dracaufeu carte rare', ...}
    # {'name': 'Pikachu VMAX carte', ...}
    # {'name': 'Lugia V Alt Art', ...}
    # ── Vintage lots scellés uniquement ──────────────────────
    {'name': 'Lot Pokémon vintage scellé', 'keywords': ['lot pokemon vintage booster ancien scelle'], 'platforms': ['leboncoin', 'vinted', 'ebay'], 'minPrice': 20, 'maxPrice': 500},
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

        if not results:
            print("  → Aucun résultat valide\n")
            continue

        # ── Filtre de cohérence par type produit ──────────────────────────────
        # Détermine le type cible depuis le nom de la recherche (ex: "ETB …" → 'etb',
        # "Tripack …" → 'tripack'). Puis ne retient pour la médiane que les
        # annonces du MÊME type — un tripack ne doit pas polluer la médiane ETB.
        target_type, _ = _detect_product_type(_normalize(name))
        if target_type:
            before_type = len(results)
            results_typed = [
                r for r in results
                if _detect_product_type(_normalize(r['title']))[0] == target_type
            ]
            removed_type = before_type - len(results_typed)
            if removed_type:
                print(f"  [Filtre] -{removed_type} mauvais type (cible: {target_type})")
            # On garde le pool typé pour la médiane ; si trop petit, on revient au pool complet
            results_for_median = results_typed if len(results_typed) >= 3 else results
        else:
            results_for_median = results

        stats = compute_stats(results_for_median)
        if not stats:
            continue

        median = stats['median']
        update_stats(search_id, stats['avg'])

        print(f"  📊 {stats['count']} annonces ({target_type or '?'}) | moy {stats['avg']}€ | méd {median}€ | confiance {confidence:.0%}")

        deals_found = 0
        # On évalue les deals sur le pool complet filtré scellé, mais avec la médiane typée
        for res in sorted(results, key=lambda x: x['price']):
            ref = get_reference_price(res['title'], kw, median, stats['count'])
            ref_price = ref['reference_price']
            margin = ((ref_price - res['price']) / ref_price) * 100
            if margin < DEAL_THRESHOLD_PCT:
                continue
            # Trust score
            trust = compute_trust(res, median, kw)
            res['trustScore'] = trust['score']
            res['trustLevel'] = trust['level']
            res['trustFlags'] = json.dumps(trust['flags'], ensure_ascii=False)
            if save_deal_with_retry(search_id, res, ref_price, margin):
                deals_found += 1
                total_deals += 1
                src = '📊TCG' if ref['source'] == 'tcgplayer' else '📉méd'
                emoji = '🔥' if margin >= 35 else '✅'
                print(f"  {emoji} {res['price']}€ (-{margin:.0f}%) [{src}] — {res['title'][:55]} [{res['platform']}]")
                send_deal_alert(res, name, ref_price, margin, confidence, is_global=True)

        if not deals_found:
            best = sorted(results, key=lambda x: x['price'])
            if best:
                b = best[0]
                diff = (median - b['price']) / median * 100
                print(f"  → Meilleur prix: {b['price']}€ ({diff:+.0f}% vs méd)")
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
