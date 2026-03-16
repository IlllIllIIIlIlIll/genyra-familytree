import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { QueryProvider } from '@/providers/query-provider'
import { AuthProvider } from '@/providers/auth-provider'
import { ToastContainer } from '@/components/ui/toast'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Genyra — Your Family Tree',
  description: 'Explore your family lineage on an interactive map',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <QueryProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
          <ToastContainer />
        </QueryProvider>
      </body>
    </html>
  )
}
