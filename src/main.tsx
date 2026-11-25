import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/plus-jakarta-sans';
import './styles/tokens.css';
import './styles/base.css';
import { App } from './App';
import { applyTheme } from './ui/theme';
import { ACCENTS } from './model/types';

applyTheme('system', ACCENTS[0]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
