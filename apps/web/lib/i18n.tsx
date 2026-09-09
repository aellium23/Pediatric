'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { TR } from './translations';

export type Lang = 'pt' | 'en' | 'es';

type Dict = Record<string, string>;

const DICTS: Record<Lang, Dict> = {
  pt: {
    'landing.badge': 'HOC · TELEPEDIATRIA',
    'landing.title': 'O pediatra de confiança, à distância de uma mensagem.',
    'landing.subtitle': 'Pediatras verificados · Seguro e privado · Sem ir à urgência por tudo.',
    'landing.cta': 'Entrar na app (escolher perfil)',
    'app.sessionAs': 'Sessão como',
    'app.switchProfile': 'Trocar perfil',
    'tab.home': 'Início',
    'tab.children': 'Crianças',
    'tab.consult': 'Consultar',
    'tab.myconsults': 'Consultas',
    'tab.content': 'Saber+',
    'tab.myaccount': 'Conta',
    'tab.notif': 'Avisos',
    'tab.inbox': 'Caixa',
    'tab.patients': 'Doentes',
    'tab.referrals': '2ª opinião',
    'tab.agenda': 'Agenda',
    'tab.profile': 'Perfil',
    'tab.finance': 'Ganhos',
    'tab.overview': 'Visão',
    'tab.verify': 'Pediatras',
    'tab.admin': 'Consultas',
    'tab.users': 'Utilizadores',
    'tab.audit': 'Auditoria',
    'tab.clinic': 'Clínica',
    'tab.account': 'Conta',
  },
  en: {
    'landing.badge': 'HOC · TELEPEDIATRICS',
    'landing.title': 'Your trusted pediatrician, one message away.',
    'landing.subtitle': 'Verified pediatricians · Secure and private · Skip the ER for everything.',
    'landing.cta': 'Enter the app (choose a profile)',
    'app.sessionAs': 'Signed in as',
    'app.switchProfile': 'Switch profile',
    'tab.home': 'Home',
    'tab.children': 'Children',
    'tab.consult': 'Find care',
    'tab.myconsults': 'Visits',
    'tab.content': 'Learn',
    'tab.myaccount': 'Account',
    'tab.notif': 'Alerts',
    'tab.inbox': 'Inbox',
    'tab.patients': 'Patients',
    'tab.referrals': '2nd opinion',
    'tab.agenda': 'Schedule',
    'tab.profile': 'Profile',
    'tab.finance': 'Earnings',
    'tab.overview': 'Overview',
    'tab.verify': 'Doctors',
    'tab.admin': 'Visits',
    'tab.users': 'Users',
    'tab.audit': 'Audit',
    'tab.clinic': 'Clinic',
    'tab.account': 'Account',
  },
  es: {
    'landing.badge': 'HOC · TELEPEDIATRÍA',
    'landing.title': 'Tu pediatra de confianza, a un mensaje de distancia.',
    'landing.subtitle': 'Pediatras verificados · Seguro y privado · Sin ir a urgencias por todo.',
    'landing.cta': 'Entrar en la app (elegir perfil)',
    'app.sessionAs': 'Sesión como',
    'app.switchProfile': 'Cambiar perfil',
    'tab.home': 'Inicio',
    'tab.children': 'Niños',
    'tab.consult': 'Consultar',
    'tab.myconsults': 'Consultas',
    'tab.content': 'Aprender',
    'tab.myaccount': 'Cuenta',
    'tab.notif': 'Avisos',
    'tab.inbox': 'Bandeja',
    'tab.patients': 'Pacientes',
    'tab.referrals': '2ª opinión',
    'tab.agenda': 'Agenda',
    'tab.profile': 'Perfil',
    'tab.finance': 'Ingresos',
    'tab.overview': 'Resumen',
    'tab.verify': 'Pediatras',
    'tab.admin': 'Consultas',
    'tab.users': 'Usuarios',
    'tab.audit': 'Auditoría',
    'tab.clinic': 'Clínica',
    'tab.account': 'Cuenta',
  },
};

/** Date/number locale that follows the chosen language. */
export const LOCALES: Record<Lang, string> = { pt: 'pt-PT', en: 'en-GB', es: 'es-ES' };

// Module-level mirror so non-React helpers (date formatters) can read the
// active locale; the provider keeps it in sync.
let activeLang: Lang = 'pt';
export function appLocale(): string {
  return LOCALES[activeLang];
}
/** Module-level tr for non-React code (API client error messages). */
export function trs(pt: string): string {
  if (activeLang === 'pt') return pt;
  return TR[activeLang][pt] ?? pt;
}

interface I18n {
  lang: Lang;
  setLang: (l: Lang) => void;
  /** Key-based lookup (landing, tab labels). */
  t: (key: string, fallback?: string) => string;
  /**
   * Source-string lookup: the Portuguese copy in the code IS the key.
   * Unknown strings fall back to Portuguese — the app never breaks.
   */
  tr: (pt: string) => string;
}

const Ctx = createContext<I18n>({
  lang: 'pt',
  setLang: () => {},
  t: (k, f) => f ?? k,
  tr: (s) => s,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('pt');

  useEffect(() => {
    const saved = (typeof window !== 'undefined' && localStorage.getItem('pedia_lang')) as Lang | null;
    if (saved === 'en' || saved === 'es' || saved === 'pt') {
      setLangState(saved);
      activeLang = saved;
      document.documentElement.lang = saved;
    }
  }, []);

  function setLang(l: Lang) {
    setLangState(l);
    activeLang = l;
    if (typeof window !== 'undefined') {
      localStorage.setItem('pedia_lang', l);
      document.documentElement.lang = l;
    }
  }

  function t(key: string, fallback?: string): string {
    return DICTS[lang][key] ?? DICTS.pt[key] ?? fallback ?? key;
  }
  function tr(pt: string): string {
    if (lang === 'pt') return pt;
    return TR[lang][pt] ?? pt;
  }
  return <Ctx.Provider value={{ lang, setLang, t, tr }}>{children}</Ctx.Provider>;
}

export function useT(): I18n {
  return useContext(Ctx);
}

/** Segmented PT/EN/ES picker (Settings → Idioma). */
export function LanguageSwitcher() {
  const { lang, setLang } = useT();
  const items: { code: Lang; label: string }[] = [
    { code: 'pt', label: '🇵🇹 Português' },
    { code: 'en', label: '🇬🇧 English' },
    { code: 'es', label: '🇪🇸 Español' },
  ];
  return (
    <div className="seg" role="radiogroup" aria-label="Idioma">
      {items.map((it) => (
        <button
          key={it.code}
          role="radio"
          aria-checked={lang === it.code}
          className={lang === it.code ? 'active' : ''}
          onClick={() => setLang(it.code)}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}
