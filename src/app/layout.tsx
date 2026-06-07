import type { Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })

export const metadata: Metadata = {
  title: { default: 'ValoTourneys', template: '%s | ValoTourneys' },
  description: 'La plataforma de torneos de Valorant más completa de Latinoamérica',
  keywords: ['valorant', 'torneo', 'esports', 'gaming', 'latam'],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="es" className="dark">
        <body className={`${inter.variable} font-sans antialiased`}>
          {children}
        </body>
      </html>
    </ClerkProvider>
  )
}
