import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Victor_Mono, Imbue } from 'next/font/google'
import './globals.css'

const victorMono = Victor_Mono({ 
  subsets: ['latin'],
  variable: '--font-victor-mono',
})

const imbue = Imbue({
  subsets: ['latin'],
  variable: '--font-imbue',
})

export const metadata: Metadata = {
  title: 'HH Goa ID Card Generator',
  description: 'Make your Hacker House Goa 2026 ID card. #FrameInGoa',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#f4f0df',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="bg-background">
      <body className={`${victorMono.variable} ${imbue.variable} font-mono antialiased`}>
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
