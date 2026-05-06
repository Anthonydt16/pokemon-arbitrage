#!/usr/bin/env python3
"""
main.py — Scraper des recherches utilisateur (toutes les 15 min)
Avec : filtres qualité, score confiance, alertes Discord, rotation UA
"""

import json, requests, schedule, time, os, sys, statistics
import psycopg2
import psycopg2.extras
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(__file__))

from scrapers.leboncoin import scrape as scrape_lbc
from scrapers.vinted import scrape as scrape_vinted
from scrapers.ebay import scrape as scrape_ebay
from filters import filter_results, is_foreign_card
from notifier import send_deal_alert
from price_reference import get_reference_price
from trust_score import compute_trust
from product_detector import group_by_product

DB_URL = os.environ.get('DATABASE_URL', 'postgresql://pokemon:pokemon@localhost:5432/pokemon')
API_BASE = os.environ.get('API_BASE', 'http://localhost:3001/api')
MIN_MARGIN = 15


def get_active_searches():
    try:
        conn = psycopg2.connect(DB_URL)
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute('SELECT * FROM "Search" WHERE active = true AND ("isGlobal" = false OR "isGlobal" IS NULL)')
        rows = cur.fetchall()
        conn.close()
        searches = []
        for row in rows:
            s = dict(row)
            s['keywords'] = json.loads(s['keywords'])
            s['platforms'] = json.loads(s['platforms'])
            s['minPrice'] = s.get('minPrice') or 0
            searches.append(s)
        return searches
    except Exception as e:
        print(f"[DB] {e}")
        return []


def update_stats(search_id, avg):
    try:
        conn = psycopg2.connect(DB_URL)
        cur = conn.cursor()
        cur.execute('UPDATE "Search" SET "lastAvgPrice"=%s, "lastScrapeAt"=%s WHERE id=%s',
                    (avg, datetime.now(timezone.utc), search_id))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"[DB] update: {e}")


def save_deal_with_retry(search_id, deal, avg, margin, max_retries=3):
    for attempt in range(1, max_retries + 1):
        if save_deal(search_id, deal, avg, margin):
            return True
        print(f"  [API] Retry {attempt}/{max_retries}...")
        time.sleep(attempt)
    return False


def save_deal(search_id, deal, avg, margin):
    try:
        r = requests.post(f"{API_BASE}/deals", json={
            'searchId': search_id, 'title': deal['title'], 'price': deal['price'],
            'url': deal['url'], 'platform': deal['platform'],
            'imageUrl': deal.get('imageUrl'), 'cardMarketPrice': round(avg, 2),
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
    prices = [r['price'] for r in results if r['price'] > 0 and not is_foreign_card(r.get('title', ''))]
    if not prices:
        return None
    median = statistics.median(prices)
    filtered = [p for p in prices if 0.2 * median <= p <= 3 * median]
    return {
        'avg': round(statistics.mean(filtered), 2),
        'median': round(statistics.median(filtered), 2),
        'min': round(min(filtered), 2),
        'max': round(max(filtered), 2),
        'count': len(filtered),
    }


def run_scraper():
    # Cleanup auto des vieux deals
    try:
        requests.delete(f"{API_BASE}/deals/cleanup", timeout=5)
    except Exception:
        pass

    print(f"\n{'='*55}")
    print(f"  Scan {time.strftime('%H:%M:%S %d/%m/%Y')}")
    print(f"{'='*55}")

    searches = get_active_searches()
    if not searches:
        print("  Aucune recherche active.")
        return

    total_deals = 0

    for search in searches:
        kw = search['keywords']
        platforms = search['platforms']
        min_p, max_p = search['minPrice'], search['maxPrice']

        print(f"\n📋 \"{search['name']}\" | {kw} | {min_p}€→{max_p}€")

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

        # Filtre qualité
        results, confidence = filter_results(raw, kw, lang_filter=True)

        if not results:
            print("  → Aucun résultat valide après filtre")
            continue

        # Stats marché globales (fallback)
        global_stats = compute_stats(results)
        if not global_stats:
            continue

        # Groupe par produit pour médiane per-produit
        groups = group_by_product(results)

        # Deals
        deals_found = 0
        for product_name, product_items in groups.items():
            stats = compute_stats(product_items)
            # Fallback sur médiane globale si pas assez d'annonces par produit
            if not stats or stats['count'] < 3:
                stats = global_stats
                used_fallback = True
            else:
                used_fallback = False

            median = stats['median']
            update_stats(search['id'], stats['avg'])

            label = f"{product_name} (fallback global)" if used_fallback else product_name
            print(f"  📊 [{label}] {stats['count']} annonces | moy {stats['avg']}€ | méd {median}€ | confiance {confidence:.0%}")

            for item in sorted(product_items, key=lambda x: x['price']):
                # Référence de prix : TCGPlayer pour singles, médiane pour scellés
                ref = get_reference_price(item['title'], kw, median, stats['count'])
                ref_price = ref['reference_price']
                margin = ((ref_price - item['price']) / ref_price) * 100
                if margin < MIN_MARGIN:
                    continue
                # Trust score
                trust = compute_trust(item, median, kw)
                item['trustScore'] = trust['score']
                item['trustLevel'] = trust['level']
                item['trustFlags'] = json.dumps(trust['flags'], ensure_ascii=False)
                item['_ref_source'] = ref['source']
                if save_deal_with_retry(search['id'], item, ref_price, margin):
                    deals_found += 1
                    total_deals += 1
                    src = '📊TCG' if ref['source'] == 'tcgplayer' else '📉méd'
                    emoji = '🔥' if margin >= 35 else '✅'
                    print(f"  {emoji} {item['price']}€ (-{margin:.0f}%) [{src}] — {item['title'][:50]} [{item['platform']}]")
                    send_deal_alert(item, search['name'], ref_price, margin, confidence, search_id=search['id'])

        if not deals_found:
            best = sorted(results, key=lambda x: x['price'])[:1]
            if best:
                b = best[0]
                print(f"  → Pas de deal. Meilleur: {b['price']}€ — {b['title'][:50]}")

    print(f"\n  ✅ {total_deals} deal(s). Prochain scan dans 15 min.")


if __name__ == '__main__':
    print("🃏 PokéArbitrage Scraper")
    print(f"   DB : {DB_PATH} | API : {API_BASE}")
    print(f"   Discord : {'configuré' if os.environ.get('DISCORD_WEBHOOK_URL') else 'non configuré (optionnel)'}\n")
    run_scraper()
    schedule.every(15).minutes.do(run_scraper)
    while True:
        schedule.run_pending()
        time.sleep(30)
