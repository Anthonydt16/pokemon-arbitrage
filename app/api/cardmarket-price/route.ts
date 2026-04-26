import { NextResponse } from 'next/server'

// Référence de prix CardMarket via scraping server-side (Next.js)
// Appelé par le scraper Python via POST /api/cardmarket-price?q=dracaufeu

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const query = searchParams.get('q')
  if (!query) return NextResponse.json({ error: 'missing q' }, { status: 400 })

  try {
    const encoded = encodeURIComponent(query)
    const url = `https://www.cardmarket.com/fr/Pokemon/Products/Singles?searchString=${encoded}&sortBy=avgSellPrice&sortDir=desc`

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'fr-FR,fr;q=0.9',
      },
      next: { revalidate: 3600 }, // Cache 1h
    })

    if (!res.ok) {
      return NextResponse.json({ price: null, source: 'cardmarket', error: `HTTP ${res.status}` })
    }

    const html = await res.text()

    // Extrait le premier prix de vente moyen
    const priceMatch = html.match(/(\d+[,\.]\d{2})\s*€/) ||
                       html.match(/avgSellPrice[^>]*>([^<]+)</) ||
                       html.match(/"price":"?(\d+\.?\d*)"?/)

    if (!priceMatch) {
      return NextResponse.json({ price: null, source: 'cardmarket' })
    }

    const priceStr = priceMatch[1].replace(',', '.')
    const price = parseFloat(priceStr)

    return NextResponse.json({ price, source: 'cardmarket', query })
  } catch (e) {
    return NextResponse.json({ price: null, source: 'cardmarket', error: String(e) })
  }
}
