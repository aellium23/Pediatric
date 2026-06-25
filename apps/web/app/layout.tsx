import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import { LanguageProvider } from '@/lib/i18n';
import { ThemeProvider } from '@/lib/theme';

export const metadata: Metadata = {
  title: 'Pédia — Telepediatria',
  description:
    'O pediatra de confiança, à distância de uma mensagem. Seguro, privado e compliant.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt">
      <body>
        <ThemeProvider>
          <LanguageProvider>{children}</LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
