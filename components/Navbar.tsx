'use client'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useI18n } from '@/lib/i18n'
import { clearAuth, getEmail } from '@/lib/client-auth'
import { useTheme } from '@/lib/theme'
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline'

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { locale, t } = useI18n()
  const [email, setEmail] = useState<string | null>(null)
  const [langOpen, setLangOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { theme, toggleTheme } = useTheme()

  useEffect(() => {
    setEmail(getEmail())
  }, [pathname])

  const links = [
    { href: `/${locale}`, label: t('nav.dashboard') },
    { href: `/${locale}/searches`, label: t('nav.searches') },
    { href: `/${locale}/settings`, label: `⚙️ ${t('nav.settings')}` },
  ]

  const logout = () => {
    clearAuth()
    setEmail(null)
    router.push(`/${locale}/login`)
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
    <nav className="bg-gray-900 border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <Link href={`/${locale}`} className="flex items-center">
              <Image
                src={theme === 'light' ? '/pokesnoop-logo-light.svg' : '/pokesnoop-logo.svg'}
                alt="PokeSnoop"
                width={160}
                height={38}
                priority
                className="h-9 w-auto"
              />
            </Link>
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

          <div className="flex items-center gap-4">
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
              >
                🌐 {locale.toUpperCase()}
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

            {!email ? (
              <div className="hidden sm:flex gap-2">
                <Link
                  href={`/${locale}/login`}
                  className="text-sm text-gray-400 hover:text-white px-3 py-2 rounded-lg hover:bg-gray-800 transition-colors"
                >
                  {t('nav.login')}
                </Link>
                <Link
                  href={`/${locale}/register`}
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
              className="sm:hidden p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="sm:hidden pb-4">
            {email && links.map(link => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="block px-4 py-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg"
              >
                {link.label}
              </Link>
            ))}
            {!email ? (
              <div className="flex flex-col gap-2 px-4 py-2">
                <Link
                  href={`/${locale}/login`}
                  onClick={() => setMobileOpen(false)}
                  className="text-gray-400 hover:text-white"
                >
                  {t('nav.login')}
                </Link>
                <Link
                  href={`/${locale}/register`}
                  onClick={() => setMobileOpen(false)}
                  className="bg-yellow-500 text-gray-900 px-3 py-2 rounded-lg font-medium"
                >
                  {t('nav.register')}
                </Link>
              </div>
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
          </div>
        )}
      </div>
    </nav>
  )
}
