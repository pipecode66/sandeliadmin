import type { Metadata, Viewport } from 'next'
import { DM_Sans, Playfair_Display } from 'next/font/google'
import './globals.css'

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
})

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Sandeli - Sano & Delicioso',
  description: 'Programa de fidelizacion Sandeli. Acumula puntos, canjea promociones y disfruta de comida saludable.',
  manifest: '/manifest.json',
  icons: {
    icon: '/images/logoIOS.png',
    apple: '/images/logoIOS.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Sandeli',
    startupImage: '/images/logoIOS.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#9f1fee',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className={`${dmSans.variable} ${playfair.variable}`}>
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  )
}
