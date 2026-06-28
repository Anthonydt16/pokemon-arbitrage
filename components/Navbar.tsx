'use client'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { useI18n } from '@/lib/i18n'
import { clearAuth, getEmail } from '@/lib/client-auth'
import { useTheme } from '@/lib/theme'
import { SunIcon, MoonIcon, Cog6ToothIcon, GlobeAltIcon } from '@heroicons/react/24/outline'

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  let locale = ''
  let t = (key: string) => key
  try {
    const i18n = useI18n()
    locale = i18n.locale
    t = i18n.t
  } catch {
    t = (key: string) => {
      const fallback: Record<string, string> = {
        'nav.dashboard': 'Dashboard',
        'nav.searches': 'Recherches',
        'nav.settings': 'Paramètres',
        'nav.login': 'Connexion',
        'nav.register': 'Inscription',
        'nav.logout': 'Déconnexion',
      }
      return fallback[key] ?? key
    }
  }
  const email = getEmail()
  const [langOpen, setLangOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { theme, toggleTheme } = useTheme()
  const basePath = locale ? `/${locale}` : ''

  const links = [
    { href: basePath || '/', label: t('nav.dashboard') },
    { href: `${basePath}/searches` || '/searches', label: t('nav.searches') },
    { href: `${basePath}/settings` || '/settings', label: <span className="inline-flex items-center gap-1"><Cog6ToothIcon className="w-4 h-4 inline-block align-text-bottom" /> {t('nav.settings')}</span> },
  ]

  const logout = () => {
    clearAuth()
    router.push(`${basePath || ''}/login` || '/login')
  }

  const switchLanguage = (newLocale: 'en' | 'fr') => {
    if (newLocale !== locale) {
      const segments = pathname.split('/')
      segments[1] = newLocale
      router.push(segments.join('/'))
      setLangOpen(false)
    }
  }

  return (
    <nav className="bg-gray-900 border-b border-gray-800 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo + Desktop Links */}
          <div className="flex items-center gap-4">
            <Link href={basePath || '/'} className="flex items-center">
              <Image
                src={theme === 'light' ? '/pokesnoop-logo-light.svg' : '/pokesnoop-logo.svg'}
                alt="PokeSnoop"
                width={160}
                height={38}
                priority
                className="h-9 w-auto"
              />
              <span className="sr-only">PokéArbitrage</span>
            </Link>
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
          </div>

          {/* Desktop actions */}
          <div className="flex items-center gap-2">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="text-sm text-gray-400 hover:text-white p-2 rounded-lg hover:bg-gray-800 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'dark'
                ? <SunIcon className="w-5 h-5" />
                : <MoonIcon className="w-5 h-5" />
              }
            </button>

            {/* Language Switcher */}
            <div className="relative">
              <button
                onClick={() => setLangOpen(!langOpen)}
                className="text-sm text-gray-400 hover:text-white px-3 py-2 rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-1"
                aria-haspopup="true"
                aria-expanded={langOpen}
              >
                <GlobeAltIcon className="w-4 h-4 mr-1 inline-block align-text-bottom" /> {locale.toUpperCase()}
              </button>
              {langOpen && (
                <div className="absolute right-0 top-12 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50 min-w-max">
                  <button
                    onClick={() => switchLanguage('en')}
                    className={`w-full text-left px-4 py-2 text-sm ${
                      locale === 'en' ? 'bg-yellow-500 text-gray-900 font-semibold' : 'text-gray-300 hover:bg-gray-700'
                    } transition-colors`}
                  >
                    🇬🇧 English
                  </button>
                  <button
                    onClick={() => switchLanguage('fr')}
                    className={`w-full text-left px-4 py-2 text-sm ${
                      locale === 'fr' ? 'bg-yellow-500 text-gray-900 font-semibold' : 'text-gray-300 hover:bg-gray-700'
                    } transition-colors rounded-b-lg`}
                  >
                    🇫🇷 Français
                  </button>
                </div>
              )}
            </div>

            {/* Desktop Auth */}
            {!email ? (
              <div className="hidden sm:flex gap-2">
                <Link
                  href={`${basePath}/login` || '/login'}
                  className="text-sm text-gray-400 hover:text-white px-3 py-2 rounded-lg hover:bg-gray-800 transition-colors"
                >
                  {t('nav.login')}
                </Link>
                <Link
                  href={`${basePath}/register` || '/register'}
                  className="text-sm bg-yellow-500 text-gray-900 px-3 py-2 rounded-lg font-medium hover:bg-yellow-600 transition-colors"
                >
                  {t('nav.register')}
                </Link>
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-4">
                <span className="text-sm text-gray-400">{email}</span>
                <button
                  onClick={logout}
                  className="text-sm text-gray-400 hover:text-white px-3 py-2 rounded-lg hover:bg-gray-800 transition-colors"
                >
                  {t('nav.logout')}
                </button>
              </div>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="sm:hidden p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-yellow-500"
              aria-label={mobileOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
              aria-expanded={mobileOpen}
              aria-controls="mobile-menu"
            >
              {mobileOpen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        <div
          id="mobile-menu"
          className={`sm:hidden transition-all duration-200 ${mobileOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0 pointer-events-none'} overflow-hidden`}
          aria-hidden={!mobileOpen}
        >
          <div className="flex flex-col gap-2 py-4">
            {email && links.map(link => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`block px-4 py-2 rounded-lg text-base font-medium transition-colors ${
                  pathname === link.href
                    ? 'bg-yellow-500 text-gray-900'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                {link.label}
              </Link>
            ))}
            {!email ? (
              <>
                <Link
                  href={`${basePath}/login` || '/login'}
                  onClick={() => setMobileOpen(false)}
                  className="block px-4 py-2 text-base text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg"
                >
                  {t('nav.login')}
                </Link>
                <Link
                  href={`${basePath}/register` || '/register'}
                  onClick={() => setMobileOpen(false)}
                  className="block px-4 py-2 text-base bg-yellow-500 text-gray-900 rounded-lg font-medium"
                >
                  {t('nav.register')}
                </Link>
              </>
            ) : (
              <div className="px-4 py-2">
                <button
                  onClick={() => { setMobileOpen(false); logout() }}
                  className="text-gray-400 hover:text-white"
                >
                  {t('nav.logout')}
                </button>
              </div>
            )}
            {/* Mobile language switcher */}
            <div className="mt-2 flex gap-2 px-4">
              <button
                onClick={() => switchLanguage('en')}
                className={`flex-1 px-4 py-2 rounded-lg text-base ${locale === 'en' ? 'bg-yellow-500 text-gray-900 font-semibold' : 'text-gray-300 hover:bg-gray-700'}`}
              >
                🇬🇧 EN
              </button>
              <button
                onClick={() => switchLanguage('fr')}
                className={`flex-1 px-4 py-2 rounded-lg text-base ${locale === 'fr' ? 'bg-yellow-500 text-gray-900 font-semibold' : 'text-gray-300 hover:bg-gray-700'}`}
              >
                🇫🇷 FR
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}
