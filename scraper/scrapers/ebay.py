import requests
import re
from bs4 import BeautifulSoup
import urllib.parse
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from user_agents import get_headers


def scrape(keywords: list, min_price: float, max_price: float) -> list:
    results = []
    query = urllib.parse.quote('+'.join(keywords))
    url = (
        f"https://www.ebay.fr/sch/i.html"
        f"?_nkw={query}+carte+pokemon"
        f"&_sacat=0"
        f"&_udlo={int(min_price)}&_udhi={int(max_price)}"
        f"&_sop=10"
    )

    print(f"  [eBay] {url}")

    try:
        resp = requests.get(url, headers=get_headers(), timeout=15)
        if resp.status_code != 200:
            print(f"  [eBay] HTTP {resp.status_code}")
            return []

        soup = BeautifulSoup(resp.text, 'html.parser')
        items = soup.select('.srp-results .s-card')
        print(f"  [eBay] {len(items)} annonces")

        for item in items:
            try:
                title_el = item.select_one('.s-card__title') or item.find('h3')
                title = title_el.get_text(strip=True) if title_el else item.get_text(' ', strip=True)[:100]
                title = re.sub(r"La page s['']ouvre.*", '', title).strip()
                if not title or len(title) < 5:
                    continue

                raw_text = item.get_text(' ', strip=True)
                price_match = re.search(r'([\d\s]+[,\.]?\d*)\s*EUR', raw_text)
                if not price_match:
                    continue
                price_str = price_match.group(1).replace('\xa0', '').replace(' ', '').replace(',', '.')
                parts = price_str.split('.')
                if len(parts) > 2:
                    price_str = parts[0] + '.' + ''.join(parts[1:])
                price = float(price_str)

                if price <= 0 or not (min_price <= price <= max_price):
                    continue

                link = item.find('a', href=True)
                if not link:
                    continue
                full_url = link['href'].split('?')[0]
                if not full_url.startswith('http'):
                    continue

                img = item.find('img')
                img_url = img.get('src') or img.get('data-defer-load') or img.get('data-src') or None
                if img_url and (img_url.startswith('data:') or 's.gif' in img_url or img_url == ''):
                    img_url = img.get('data-defer-load') or img.get('data-src') or None

                # isPro : eBay indique "Professionnel" dans le texte
                is_pro = bool(re.search(r'professionnel|vendeur professionnel', raw_text, re.IGNORECASE))

                # photoCount : 1 par défaut (eBay montre 1 image en liste)
                photo_count = 1

                results.append({
                    'title': title[:200],
                    'price': price,
                    'url': full_url,
                    'platform': 'ebay',
                    'imageUrl': img_url,
                    'location': None,
                    'isPro': is_pro,
                    'photoCount': photo_count,
                })
            except Exception:
                continue

    except Exception as e:
        print(f"  [eBay] Erreur: {e}")

    return results
