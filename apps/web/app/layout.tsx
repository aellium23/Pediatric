import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { Inter } from 'next/font/google';
import './globals.css';

// Brand UI typeface — variable, swap-safe; falls back to the system stack.
const inter = Inter({ subsets: ['latin'], display: 'swap', variable: '--font-ui' });
import { LanguageProvider } from '@/lib/i18n';
import { ThemeProvider } from '@/lib/theme';
import { RegisterSW } from '@/lib/sw-register';
import { RecoverOnResume } from '@/lib/lifecycle';

export const metadata: Metadata = {
  title: 'HOC — Healthcare on Call',
  description:
    'O pediatra de confiança, à distância de uma mensagem. Seguro, privado e compliant. Uma solução DES.',
  applicationName: 'HOC',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'HOC' },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f6f7f9' },
    { media: '(prefers-color-scheme: dark)', color: '#0c111c' },
  ],
};

// Applied before first paint so "system" theme (and a saved choice) is honored
// immediately — no light flash before React hydrates.
const themeBootstrap = `(function(){try{var t=localStorage.getItem('pedia_theme')||'system';var s=localStorage.getItem('pedia_text')||'normal';var d=t==='dark'||(t==='system'&&window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches);var e=document.documentElement;e.setAttribute('data-theme',d?'dark':'light');e.setAttribute('data-text',s);}catch(_){}})();`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt" suppressHydrationWarning className={inter.variable}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body>
        <ThemeProvider>
          <LanguageProvider>{children}</LanguageProvider>
        </ThemeProvider>
        <RegisterSW />
        <RecoverOnResume />
      </body>
    </html>
  );
}
