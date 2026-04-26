import { NextRequest, NextResponse } from 'next/server'

const ALLOWED_HOSTS = ['i.ebayimg.com', 'thumbs.static-leboncoin.fr', 'thumbs2.static-leboncoin.fr', 'img.leboncoin.fr', 'images.vinted.fr', 'images1.vinted.net', 'images2.vinted.net', 'images3.vinted.net']

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url')
  if (!url) return NextResponse.json({ error: 'missing url' }, { status: 400 })

  let hostname: string
  try {
    hostname = new URL(url).hostname
  } catch {
    return NextResponse.json({ error: 'invalid url' }, { status: 400 })
  }

  if (!ALLOWED_HOSTS.some(h => hostname.endsWith(h))) {
    return NextResponse.json({ error: 'host not allowed' }, { status: 403 })
  }

  try {
    const resp = await fetch(url, {
      headers: {
        'Referer': hostname.includes('ebay') ? 'https://www.ebay.fr/' : 'https://www.leboncoin.fr/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    })
    const buffer = await resp.arrayBuffer()
    const contentType = resp.headers.get('content-type') || 'image/jpeg'
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
      },
    })
  } catch {
    return NextResponse.json({ error: 'fetch failed' }, { status: 502 })
  }
}
