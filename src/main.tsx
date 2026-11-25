import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/plus-jakarta-sans';
import './styles/tokens.css';
import './styles/base.css';
import './styles/tasks.css';
import './styles/sheets.css';
import { App } from './App';
import { applyTheme } from './ui/theme';
import { useData } from './store/store';
import { loadData, startAutosave } from './store/persistence';
import { isNative } from './platform/native';

async function boot() {
  const params = new URLSearchParams(location.search);
  const demo = !isNative && params.has('demo');
  let data;
  if (demo) {
    data = (await import('./model/demo')).demoData();
  } else {
    data = (await loadData()).data;
  }
  if (params.has('dark')) data.settings.theme = 'dark';
  if (params.get('accent')) data.settings.accent = '#' + params.get('accent');
  useData.getState().init(data);

  // Theme follows settings.
  const s0 = data.settings;
  applyTheme(s0.theme, s0.accent, s0.reduceMotion);
  useData.subscribe((s, prev) => {
    const a = s.data.settings;
    const b = prev.data.settings;
    if (a.theme !== b.theme || a.accent !== b.accent || a.reduceMotion !== b.reduceMotion) applyTheme(a.theme, a.accent, a.reduceMotion);
  });

  if (!demo) startAutosave();

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void boot();
