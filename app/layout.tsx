import type { Metadata } from 'next'
import { Inter, Nunito } from 'next/font/google'
import { ThemeProvider } from '@/lib/theme'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })
const nunito = Nunito({ subsets: ['latin'], weight: ['800', '900'], variable: '--font-nunito' })

export const metadata: Metadata = {
  title: 'PokeSnoop',
  description: 'Stop searching. Start snooping.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html className="dark" suppressHydrationWarning>
      <body className={`${inter.className} ${nunito.variable} min-h-screen`}>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}

