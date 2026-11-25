// Renders assets/icon-source.html into the PNGs that `npx @capacitor/assets generate` turns into Android icons.
// Run: node scripts/render-icons.mjs   (needs Playwright + Chromium)
import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const dir = path.resolve('assets');
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 2800, height: 2800 }, deviceScaleFactor: 1 });
await page.goto('file://' + path.join(dir, 'icon-source.html'));
const out = { full: 'icon-only.png', fg: 'icon-foreground.png', bg: 'icon-background.png', splash: 'splash.png', splashdark: 'splash-dark.png' };
for (const [id, file] of Object.entries(out)) {
  await page.locator('#' + id).screenshot({ path: path.join(dir, file), omitBackground: true });
  console.log('rendered', file);
}
await browser.close();
