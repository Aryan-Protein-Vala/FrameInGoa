import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Victor_Mono, Imbue } from 'next/font/google'
import { CustomCursor } from '@/components/custom-cursor'
import { Toaster } from 'sonner'
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
  title: 'Frame in Goa | Hacker House ID Generator',
  description: 'Generate your official Hacker House Goa 2026 ID Card. Build. Ship. Repeat.',
  icons: {
    icon: '/icon.svg',
  }
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
        <CustomCursor />
        {children}
        <Toaster toastOptions={{ className: 'font-mono text-xs font-bold uppercase rounded-none border-2 border-foreground shadow-[4px_4px_0_var(--foreground)]' }} />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
