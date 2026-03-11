import type { Metadata, Viewport } from 'next'
import { Toaster } from 'sonner'
import './globals.css'
import ThemeProvider from './providers/ThemeProvider'
import AuthErrorRedirect from './components/AuthErrorRedirect'

export const viewport: Viewport = {
  colorScheme: 'light',
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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Prevent flash of unstyled content (FOUC) by applying light theme early */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  document.documentElement.classList.remove('dark');
                  document.documentElement.setAttribute('data-theme', 'light');
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body suppressHydrationWarning>
        <ThemeProvider>
          <AuthErrorRedirect />
          <Toaster richColors position="top-center" />
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
