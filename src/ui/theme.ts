import type { ThemeMode } from '../model/types';

/** Relative luminance of a hex colour (0..1). */
export function luminance(hex: string): number {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}

/** Black or white text, whichever reads better on `hex`. */
export function inkFor(hex: string): string {
  const L = luminance(hex);
  const contrastWhite = 1.05 / (L + 0.05);
  const contrastBlack = (L + 0.05) / 0.05;
  return contrastWhite >= contrastBlack * 0.62 ? '#ffffff' : '#111118';
}

export function resolveTheme(mode: ThemeMode): 'light' | 'dark' {
  if (mode !== 'system') return mode;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

let current: { mode: ThemeMode; accent: string; reduceMotion: boolean } | null = null;
let listeners: ((t: 'light' | 'dark') => void)[] = [];

export function onThemeResolved(fn: (t: 'light' | 'dark') => void) {
  listeners.push(fn);
}

export function applyTheme(mode: ThemeMode, accent: string, reduceMotion = false) {
  current = { mode, accent, reduceMotion };
  const root = document.documentElement;
  const resolved = resolveTheme(mode);
  root.dataset.theme = resolved;
  root.dataset.motion = reduceMotion ? 'reduce' : 'full';
  root.style.setProperty('--accent', accent);
  root.style.setProperty('--accent-ink', inkFor(accent));
  const bg = resolved === 'dark' ? '#0d0d14' : '#f5f5fa';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bg);
  listeners.forEach((fn) => fn(resolved));
}

window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener?.('change', () => {
  if (current?.mode === 'system') applyTheme(current.mode, current.accent, current.reduceMotion);
});
