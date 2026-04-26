'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Navbar() {
  const pathname = usePathname()

  const links = [
    { href: '/', label: 'Dashboard' },
    { href: '/searches', label: 'Recherches' },
    { href: '/settings', label: '⚙️ Paramètres' },
  ]

  return (
    <nav className="bg-gray-900 border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2 font-bold text-xl text-white">
              <span>🃏</span>
              <span className="text-yellow-400">PokéArbitrage</span>
            </Link>
            <div className="flex gap-1">
              {links.map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    pathname === link.href
                      ? 'bg-yellow-500 text-gray-900'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="text-xs text-gray-500">
            Scraper actif · toutes les 15min
          </div>
        </div>
      </div>
    </nav>
  )
}
