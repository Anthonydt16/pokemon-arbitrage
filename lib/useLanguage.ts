'use client'

import { useLocale } from 'next-intl'
import { useRouter, usePathname } from 'next/navigation'

export function useLanguage() {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()

  const switchLanguage = (newLocale: 'en' | 'fr') => {
    if (newLocale !== locale) {
      // Remove current locale from pathname
      const segments = pathname.split('/')
      segments[1] = newLocale
      router.push(segments.join('/'))
    }
  }

  return {
    locale: locale as 'en' | 'fr',
    switchLanguage,
  }
}
