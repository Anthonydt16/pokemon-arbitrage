'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { clearAuth, getEmail } from '@/lib/client-auth'

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState<string | null>(null)

  useEffect(() => {
    setEmail(getEmail())
  }, [pathname])

  const links = [
    { href: '/', label: 'Dashboard' },
    { href: '/searches', label: 'Recherches' },
    { href: '/settings', label: '⚙️ Paramètres' },
  ]

  const logout = () => {
    clearAuth()
    setEmail(null)
    router.push('/login')
  }

  return (
    <nav className="bg-gray-900 border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 font-bold text-xl text-white">
              <span>🃏</span>
              <span className="text-yellow-400">PokéArbitrage</span>
            </Link>
            {/* Desktop links — only for authenticated users */}
            {email && (
              <div className="hidden sm:flex gap-1">
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
            )}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {email && <div className="hidden sm:block text-xs text-gray-500">Scraper actif · toutes les 15min</div>}

            {email ? (
              <>
                <span className="hidden md:block text-xs text-gray-400">{email}</span>
                <button
                  onClick={logout}
                  className="hidden sm:inline-flex bg-gray-800 hover:bg-gray-700 text-gray-200 text-sm px-3 py-2 rounded-lg"
                >
                  Déconnexion
                </button>
              </>
            ) : (
              <div className="hidden sm:flex items-center gap-2">
                <Link href="/login" className="text-sm text-gray-300 hover:text-white px-3 py-2 rounded-lg hover:bg-gray-800">
                  Connexion
                </Link>
                <Link href="/register" className="bg-yellow-500 hover:bg-yellow-400 text-gray-900 text-sm font-semibold px-3 py-2 rounded-lg">
                  Inscription
                </Link>
              </div>
            )}

            {/* Mobile menu button */}
            <button
              aria-label="menu"
              onClick={() => setOpen(!open)}
              className="sm:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-800"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
            </button>
          </div>
        </div>

        {/* Mobile menu panel */}
        {open && (
          <div className="sm:hidden mt-2 mb-2">
            <div className="flex flex-col gap-1">
              {email && links.map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={`block px-4 py-2 rounded-lg text-base font-medium transition-colors ${
                    pathname === link.href
                      ? 'bg-yellow-500 text-gray-900'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              {email ? (
                <button
                  onClick={() => { setOpen(false); logout() }}
                  className="text-left block px-4 py-2 rounded-lg text-base font-medium text-gray-300 hover:text-white hover:bg-gray-800"
                >
                  Déconnexion
                </button>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setOpen(false)}
                    className="block px-4 py-2 rounded-lg text-base font-medium text-gray-300 hover:text-white hover:bg-gray-800"
                  >
                    Connexion
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setOpen(false)}
                    className="block px-4 py-2 rounded-lg text-base font-medium text-gray-300 hover:text-white hover:bg-gray-800"
                  >
                    Inscription
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
