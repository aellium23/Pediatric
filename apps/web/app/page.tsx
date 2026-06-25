'use client';

import Link from 'next/link';
import { useT, LanguageSwitcher } from '@/lib/i18n';

export default function Home() {
  const { t } = useT();
  return (
    <main>
      <section className="hero">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="badge">{t('landing.badge')}</span>
          <LanguageSwitcher />
        </div>
        <h1>{t('landing.title')}</h1>
        <p className="muted">{t('landing.subtitle')}</p>
        <Link className="cta" href="/app">
          {t('landing.cta')}
        </Link>
        <p className="muted" style={{ marginTop: 16 }}>
          <Link href="/marketplace">marketplace</Link> · <Link href="/tour">tour</Link> 📱
        </p>
      </section>
    </main>
  );
}
