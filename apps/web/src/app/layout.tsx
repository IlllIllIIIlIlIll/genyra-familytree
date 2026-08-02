import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import Script from 'next/script'
import './globals.css'
import { QueryProvider } from '@/providers/query-provider'
import { AuthProvider } from '@/providers/auth-provider'
import { ThemeProvider } from '@/providers/theme-provider'
import { ToastContainer } from '@/components/ui/toast'

// Runs before hydration to apply the persisted theme/mode synchronously,
// avoiding a flash of the default (rose/system) theme on first paint.
const THEME_INIT_SCRIPT = `
(function () {
  try {
    var raw = localStorage.getItem('genyra-theme');
    var state = raw ? JSON.parse(raw).state : null;
    var theme = (state && state.theme) || 'rose';
    var mode = (state && state.mode) || 'system';
    var dark = mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.classList.toggle('dark', dark);
  } catch (e) {}
})();
`

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Genyra — Your Family Tree',
  description: 'Explore your family lineage on an interactive map',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Genyra',
  },
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
        <Script id="theme-init" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <ThemeProvider>
          <QueryProvider>
            <AuthProvider>
              {children}
            </AuthProvider>
            <ToastContainer />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
