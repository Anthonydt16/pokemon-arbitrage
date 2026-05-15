import type { Metadata } from 'next'
import Navbar from '@/components/Navbar'
import { I18nProvider } from '@/lib/i18n'

export const metadata: Metadata = {
  title: 'PokeSnoop',
  description: 'Stop searching. Start snooping. · Arrêtez de chercher. Commencez à fouiner.',
}

async function getMessages(locale: string) {
  try {
    return (await import(`@/messages/${locale}.json`)).default
  } catch (error) {
    console.error(`Failed to load messages for locale: ${locale}`, error)
    return {}
  }
}

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { locale: string }
}) {
  const { locale } = await params
  const messages = await getMessages(locale)

  return (
    <I18nProvider locale={locale} messages={messages}>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-8">
        {children}
      </main>
    </I18nProvider>
  )
}
