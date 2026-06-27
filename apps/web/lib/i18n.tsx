'use client';

import { createContext, useContext, type ReactNode } from 'react';

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

// The app is Portuguese-only for now. The EN/ES dictionaries only ever covered
// the bottom-nav labels, so exposing a switcher promised a translation that
// didn't exist. We keep the i18n plumbing (and the dictionaries) for when full
// localization lands, but force pt and hide the switcher until then.
export function LanguageProvider({ children }: { children: ReactNode }) {
  const lang: Lang = 'pt';
  const setLang = (_l: Lang) => {
    /* single-language for now */
  };
  function t(key: string, fallback?: string): string {
    return DICTS.pt[key] ?? fallback ?? key;
  }
  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>;
}

export function useT(): I18n {
  return useContext(Ctx);
}

// Hidden while the app is Portuguese-only (see LanguageProvider).
export function LanguageSwitcher() {
  return null;
}
