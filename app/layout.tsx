import type { Metadata, Viewport } from 'next'
import { Nunito, Josefin_Sans, Inter } from 'next/font/google'
import './globals.css'
import ThemeProvider from './providers/ThemeProvider'
import RealtimeProvider from './providers/RealtimeProvider'
import AuthErrorRedirect from './components/AuthErrorRedirect'
import { AppToaster } from '@/components/ui/AppToaster'

const nunito = Nunito({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  display: 'swap',
})

const josefin = Josefin_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-josefin',
})

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

export const viewport: Viewport = {
  colorScheme: 'dark light',
}

export const metadata: Metadata = {
  title: 'Fresh Creative SaaS',
  description: 'Fresh Creative SaaS App',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        {/* Prevent flash of unstyled content (FOUC) by applying theme early */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var urlParams = new URLSearchParams(window.location.search);
                  var urlTheme = urlParams.get('theme');
                  var saved = localStorage.getItem('theme');
                  var isDark = false;
                  
                  if (urlTheme === 'dark' || urlTheme === 'light') {
                    isDark = urlTheme === 'dark';
                  } else if (saved === 'dark' || saved === 'light') {
                    isDark = saved === 'dark';
                  } else {
                    isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  }

                  if (isDark) {
                    document.documentElement.classList.add('dark');
                    document.documentElement.setAttribute('data-theme', 'dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                    document.documentElement.setAttribute('data-theme', 'light');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className={`${nunito.className} ${josefin.variable} ${inter.variable}`} suppressHydrationWarning>
        <ThemeProvider>
          <RealtimeProvider>
            <AuthErrorRedirect />
            <AppToaster />
            {children}
          </RealtimeProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
