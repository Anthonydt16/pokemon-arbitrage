import requests
import re
from datetime import datetime, timedelta, timezone
from bs4 import BeautifulSoup
import urllib.parse
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from user_agents import get_headers


def _parse_alt(alt: str):
    """Extrait titre et prix depuis l'attribut alt des images Vinted."""
    if not alt:
        return None, None
    # Prix : ex "99,00 €" ou "99.00 €"
    price_match = re.search(r'([\d\s]+[,\.][\d]{2})\s*€', alt)
    price = 0.0
    if price_match:
        ps = price_match.group(1).replace('\xa0', '').replace(' ', '').replace(',', '.')
        try:
            price = float(ps)
        except ValueError:
            pass
    # Titre = tout avant la première virgule suivie d'un label connu
    title = re.split(r',\s*(marque|état|condition|taille|couleur)\s*:', alt, flags=re.IGNORECASE)[0].strip()
    return title, price


def _parse_relative_datetime(text: str):
    if not text:
        return None
    t = text.lower().strip()
    now = datetime.now(timezone.utc)

    if "à l'instant" in t or "a l'instant" in t or 'just now' in t:
        return now.isoformat()
    if 'hier' in t or 'yesterday' in t:
        return (now - timedelta(days=1)).isoformat()

    m = re.search(r'(\d+)\s*(h|heure|heures|hour|hours)', t)
    if m:
        return (now - timedelta(hours=int(m.group(1)))).isoformat()

    m = re.search(r'(\d+)\s*(j|jour|jours|day|days)', t)
    if m:
        return (now - timedelta(days=int(m.group(1)))).isoformat()

    return None


def _extract_published_at(item):
    # Prefer explicit datetime from <time datetime="...">
    time_el = item.find('time')
    if time_el:
        dt_raw = (time_el.get('datetime') or '').strip()
        if dt_raw:
            try:
                dt = datetime.fromisoformat(dt_raw.replace('Z', '+00:00'))
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
                return dt.astimezone(timezone.utc).isoformat()
            except Exception:
                pass

        rel = time_el.get_text(' ', strip=True)
        rel_iso = _parse_relative_datetime(rel)
        if rel_iso:
            return rel_iso

    # Fallback on full card text if relative date is present
    card_text = item.get_text(' ', strip=True)
    return _parse_relative_datetime(card_text)


def scrape(keywords: list, min_price: float, max_price: float) -> list:
    results = []
    query = urllib.parse.quote(' '.join(keywords))
    url = (f"https://www.vinted.fr/catalog?search_text={query}"
           f"&price_to={int(max_price)}&price_from={int(min_price)}&currency=EUR")

    print(f"  [Vinted] {url}")

    try:
        resp = requests.get(url, headers=get_headers(), timeout=15)
        if resp.status_code != 200:
            print(f"  [Vinted] HTTP {resp.status_code}")
            return []

        soup = BeautifulSoup(resp.text, 'html.parser')
        items = soup.select('[data-testid="grid-item"]')
        print(f"  [Vinted] {len(items)} articles")

        for item in items:
            try:
                img = item.find('img')
                if not img:
                    continue

                alt = img.get('alt', '')
                title, price = _parse_alt(alt)

                if not title or not price:
                    continue
                if not (min_price <= price <= max_price):
                    continue

                link = item.find('a', href=True)
                if not link:
                    continue
                href = link['href']
                full_url = href if href.startswith('http') else f"https://www.vinted.fr{href}"

                img_url = img.get('src') or None
                if img_url and img_url.startswith('data:'):
                    img_url = None

                # isPro : cherche badge "Pro" dans la card
                card_text = item.get_text(' ', strip=True)
                is_pro = bool(re.search(r'\bpro\b', card_text, re.IGNORECASE))

                # photoCount : count <img> dans la card
                imgs = item.find_all('img')
                photo_count = len(imgs)

                results.append({
                    'title': title[:200],
                    'price': price,
                    'url': full_url,
                    'platform': 'vinted',
                    'imageUrl': img_url,
                    'location': None,
                    'isPro': is_pro,
                    'photoCount': photo_count,
                    'publishedAt': _extract_published_at(item),
                })
            except Exception:
                continue

    except Exception as e:
        print(f"  [Vinted] Erreur: {e}")

    return results
