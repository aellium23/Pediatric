import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import { TR } from './translations';

/**
 * The dictionaries are keyed by the Portuguese source string, and a missing key
 * falls back to Portuguese instead of failing. That fallback is the point — no
 * user ever sees an empty label — but it also means a whole feature can ship
 * untranslated without anything breaking. It already happened once: the
 * document vault, the plan allowance and the analytics screens went into `es`
 * and were missed in `en`, and only a manual diff caught it.
 *
 * These tests turn that class of omission into a red build.
 */

const APP = readFileSync(join(__dirname, '..', 'app', 'app', 'page.tsx'), 'utf8');

/** Single-quoted literals passed straight to tr(), which is how the app writes them. */
function translatedLiterals(source: string): string[] {
  const found = new Set<string>();
  for (const m of source.matchAll(/\btr\(\s*'((?:[^'\\]|\\.)*)'\s*\)/g)) {
    found.add(m[1].replace(/\\'/g, "'").replace(/\\\\/g, '\\'));
  }
  return [...found];
}

describe('translation dictionaries', () => {
  it('cover the same set of keys in every language', () => {
    const en = Object.keys(TR.en);
    const es = Object.keys(TR.es);
    expect(es.filter((k) => !(k in TR.en))).toEqual([]);
    expect(en.filter((k) => !(k in TR.es))).toEqual([]);
  });

  it('translate every string the app renders through tr()', () => {
    const keys = translatedLiterals(APP);
    // A guard on the guard: if the regex ever stops matching, the test must not
    // quietly pass by finding nothing to check.
    expect(keys.length).toBeGreaterThan(500);
    expect(keys.filter((k) => !(k in TR.en))).toEqual([]);
    expect(keys.filter((k) => !(k in TR.es))).toEqual([]);
  });

  it('leave no entry empty or untranslated by accident', () => {
    for (const lang of ['en', 'es'] as const) {
      for (const [key, value] of Object.entries(TR[lang])) {
        expect(value.trim(), `${lang}: ${key}`).not.toBe('');
      }
    }
  });
});
