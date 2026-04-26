import requests
import json
import time
from bs4 import BeautifulSoup
import urllib.parse
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from user_agents import get_headers


def scrape(keywords: list, min_price: float, max_price: float, category: str = '', pages: int = 3) -> list:
    results = []
    query = urllib.parse.quote(' '.join(keywords))

    for page_num in range(1, pages + 1):
        url = f"https://www.leboncoin.fr/recherche?text={query}&price={int(min_price)}-{int(max_price)}&page={page_num}"
        if category:
            url += f"&category={category}"

        print(f"  [LBC] page {page_num} — {url}")

        try:
            resp = requests.get(url, headers=get_headers(), timeout=15)
            if resp.status_code != 200:
                print(f"  [LBC] HTTP {resp.status_code}")
                break

            soup = BeautifulSoup(resp.text, 'html.parser')
            next_data_el = soup.find('script', {'id': '__NEXT_DATA__'})
            if not next_data_el:
                print("  [LBC] __NEXT_DATA__ introuvable")
                break

            data = json.loads(next_data_el.string)
            search_data = data.get('props', {}).get('pageProps', {}).get('searchData', {})
            ads = search_data.get('ads', [])
            max_pages = search_data.get('max_pages', 1)

            print(f"  [LBC] {len(ads)} annonces (page {page_num}/{max_pages})")

            for ad in ads:
                try:
                    title = ad.get('subject', '').strip()
                    price_list = ad.get('price', [0])
                    price = float(price_list[0]) if price_list else 0
                    url_ad = ad.get('url', '')
                    if not url_ad.startswith('http'):
                        url_ad = 'https://www.leboncoin.fr' + url_ad

                    images = ad.get('images', {})
                    img_urls = images.get('urls', []) or images.get('urls_large', []) or images.get('urls_thumb', [])
                    img_url = img_urls[0] if img_urls else None

                    location = ad.get('location', {})
                    city = location.get('city', '')
                    dept = location.get('department_name', '')
                    loc_str = f"{city} ({dept})" if city and dept else city or dept or None

                    # isPro : LBC indique "Pro" dans owner_type ou attributes
                    owner = ad.get('owner', {})
                    owner_type = owner.get('type', '').lower()
                    ad_text = json.dumps(ad).lower()
                    is_pro = owner_type in ('pro', 'professionnel') or '"pro"' in ad_text or 'professionnel' in ad_text

                    # photoCount : nombre d'images
                    photo_count = len(img_urls) if img_urls else 0

                    if title and min_price <= price <= max_price:
                        results.append({
                            'title': title[:200],
                            'price': price,
                            'url': url_ad,
                            'platform': 'leboncoin',
                            'imageUrl': img_url,
                            'location': loc_str,
                            'isPro': is_pro,
                            'photoCount': photo_count,
                        })
                except Exception:
                    continue

            # Stop si dernière page atteinte
            if page_num >= max_pages:
                break

            time.sleep(2)  # politesse entre les pages

        except Exception as e:
            print(f"  [LBC] Erreur page {page_num}: {e}")
            break

    return results
