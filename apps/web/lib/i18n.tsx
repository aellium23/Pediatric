'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

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
    'tab.children': 'Crianças',
    'tab.consult': 'Consultar',
    'tab.myconsults': 'Consultas',
    'tab.content': 'Saber+',
    'tab.myaccount': 'Conta',
    'tab.notif': 'Avisos',
    'tab.inbox': 'Caixa',
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
    'tab.children': 'Children',
    'tab.consult': 'Find care',
    'tab.myconsults': 'Visits',
    'tab.content': 'Learn',
    'tab.myaccount': 'Account',
    'tab.notif': 'Alerts',
    'tab.inbox': 'Inbox',
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
    'tab.children': 'Niños',
    'tab.consult': 'Consultar',
    'tab.myconsults': 'Consultas',
    'tab.content': 'Aprender',
    'tab.myaccount': 'Cuenta',
    'tab.notif': 'Avisos',
    'tab.inbox': 'Bandeja',
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

interface I18n {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, fallback?: string) => string;
}

const Ctx = createContext<I18n>({
  lang: 'pt',
  setLang: () => {},
  t: (k, f) => f ?? k,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('pt');

  useEffect(() => {
    const saved = (typeof window !== 'undefined' && localStorage.getItem('pedia_lang')) as Lang | null;
    if (saved && ['pt', 'en', 'es'].includes(saved)) {
      setLangState(saved);
      return;
    }
    const nav = typeof navigator !== 'undefined' ? navigator.language.slice(0, 2) : 'pt';
    if (nav === 'en' || nav === 'es') setLangState(nav);
  }, []);

  function setLang(l: Lang) {
    setLangState(l);
    if (typeof window !== 'undefined') localStorage.setItem('pedia_lang', l);
  }

  function t(key: string, fallback?: string): string {
    return DICTS[lang][key] ?? DICTS.pt[key] ?? fallback ?? key;
  }

  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>;
}

export function useT(): I18n {
  return useContext(Ctx);
}

export function LanguageSwitcher() {
  const { lang, setLang } = useT();
  const langs: Lang[] = ['pt', 'en', 'es'];
  return (
    <span style={{ display: 'inline-flex', gap: 4 }}>
      {langs.map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          className={l === lang ? 'pill ok' : 'pill muted'}
          style={{ border: 'none', cursor: 'pointer', textTransform: 'uppercase' }}
        >
          {l}
        </button>
      ))}
    </span>
  );
}
