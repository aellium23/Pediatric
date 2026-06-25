'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type Theme = 'light' | 'dark' | 'system';
export type TextSize = 'normal' | 'large';

interface ThemeCtx {
  theme: Theme;
  setTheme: (t: Theme) => void;
  textSize: TextSize;
  setTextSize: (s: TextSize) => void;
}

const Ctx = createContext<ThemeCtx>({
  theme: 'system',
  setTheme: () => {},
  textSize: 'normal',
  setTextSize: () => {},
});

function resolve(theme: Theme): 'light' | 'dark' {
  if (theme !== 'system') return theme;
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
}

function apply(theme: Theme, textSize: TextSize) {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', resolve(theme));
  document.documentElement.setAttribute('data-text', textSize);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system');
  const [textSize, setTextSizeState] = useState<TextSize>('normal');

  useEffect(() => {
    const t = (localStorage.getItem('pedia_theme') as Theme) || 'system';
    const s = (localStorage.getItem('pedia_text') as TextSize) || 'normal';
    setThemeState(t);
    setTextSizeState(s);
    apply(t, s);
    // React to OS theme changes while on "system".
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      if ((localStorage.getItem('pedia_theme') as Theme) === 'system') apply('system', s);
    };
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);

  function setTheme(t: Theme) {
    setThemeState(t);
    localStorage.setItem('pedia_theme', t);
    apply(t, textSize);
  }
  function setTextSize(s: TextSize) {
    setTextSizeState(s);
    localStorage.setItem('pedia_text', s);
    apply(theme, s);
  }

  return (
    <Ctx.Provider value={{ theme, setTheme, textSize, setTextSize }}>{children}</Ctx.Provider>
  );
}

export function useTheme(): ThemeCtx {
  return useContext(Ctx);
}
