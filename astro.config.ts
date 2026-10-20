import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { nodes, pathOf, SITE, locales } from './src/lib/routes';

// Pages flagged `draft: true` or `template: true` are noindex, so keep them out of the sitemap.
const hidden = new Set<string>();
for (const lang of locales) {
  const dir = `./src/content/pages/${lang}`;
  if (!existsSync(dir)) continue;
  for (const f of readdirSync(dir)) {
    const fm = readFileSync(`${dir}/${f}`, 'utf8').split('---')[1] ?? '';
    if (/^(draft|template):\s*true/m.test(fm)) {
      const id = f.replace(/\.md$/, '');
      if (nodes.some((n) => n.id === id)) hidden.add(new URL(pathOf(id, lang), SITE).toString());
    }
  }
}

export default defineConfig({
  site: SITE,
  trailingSlash: 'always',
  build: { format: 'directory' },
  compressHTML: true,
  prefetch: { prefetchAll: false },
  integrations: [
    sitemap({
      i18n: { defaultLocale: 'en', locales: { en: 'en-US', de: 'de-DE' } },
      filter: (page) => !hidden.has(page) && !page.includes('/design-system'),
    }),
  ],
});
