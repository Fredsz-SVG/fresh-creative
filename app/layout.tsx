import type { Metadata } from 'next'
import { Toaster } from 'sonner'
import './globals.css'
import ThemeProvider from './providers/ThemeProvider'
import AuthErrorRedirect from './components/AuthErrorRedirect'

export const metadata: Metadata = {
  title: 'Fresh Creative SaaS',
  description: 'Fresh Creative SaaS App',
  colorScheme: 'light dark',
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
                  // Use the same key as ThemeProvider ('theme')
                  var theme = localStorage.getItem('theme');
                  if (!theme) {
                    theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                  }
                  if (theme === 'dark') {
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
      <body>
        <ThemeProvider>
          <AuthErrorRedirect />
          <Toaster richColors position="top-center" />
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
