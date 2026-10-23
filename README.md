# PARADOX CAT website

[![CI](https://github.com/tommodore/PDX-Website-Draft/actions/workflows/ci.yml/badge.svg)](https://github.com/tommodore/PDX-Website-Draft/actions/workflows/ci.yml)
[![Deploy](https://github.com/tommodore/PDX-Website-Draft/actions/workflows/deploy.yml/badge.svg)](https://github.com/tommodore/PDX-Website-Draft/actions/workflows/deploy.yml)

Source of the public website of [PARADOX CAT](https://paradox.cat): a fast, static, bilingual (EN/DE) site with a dark design system, Git-based content editing and automated quality gates.

## Highlights

- **Static by default.** Astro, zero client JavaScript unless a feature needs it, fully crawlable HTML.
- **Bilingual.** English (default) and German with translated slugs, language switcher and hreflang.
- **Content as Markdown.** Pages, case studies, insights, team and jobs live in `src/content/`, edited in [Pages CMS](https://pagescms.org) or any editor.
- **Design system.** Tokens, components and live specimens at `/design-system/` (see [DESIGN.md](DESIGN.md)).
- **SEO and AEO.** Sitemap, canonical URLs, Open Graph, JSON-LD (Organization, WebSite, BreadcrumbList, Article, JobPosting), `llms.txt`.
- **Privacy first.** No cookies, no third-party trackers, self-hosted fonts. Analytics is off unless configured.
- **Quality gates.** Type check, build, link check, axe (WCAG 2 AA) and Lighthouse (all categories 95 or higher) run in CI.

## Quick start

Requires Node 24 or newer (npm 11).

```bash
npm ci
npm run dev        # http://localhost:4321
npm run build      # static output in dist/
npm run preview    # serve dist/ on :4321
```

| Script | Purpose |
|---|---|
| `npm run check` | Astro type check |
| `npm run test:links` | Internal link check (needs `preview` running) |
| `npm run test:a11y` | axe via pa11y, WCAG 2 AA |
| `npm run test:lhci` | Lighthouse CI |

## Project structure

```
src/
  content/{pages,cases,insights,team,jobs}/{en,de}/   Markdown content, same slug per language
  components/                                         Astro components
  data/clients.ts                                     Brand wall entries
  lib/routes.ts                                       Sitemap, slugs, hierarchy (single source of truth)
  lib/greenhouse.ts                                   Build-time job board loader
  styles/tokens.css                                   Design tokens
  assets/illustrations/                               Optimized stills
public/                                               CNAME, robots.txt, llms.txt, brand, media (web-optimized video)
docs/redirects.csv                                    Old-to-new URL map
illustrations.md                                      Manifest of generated imagery
```

## Content model

- **Routes.** Add or move a page in `src/lib/routes.ts` (id, parent, EN slug, DE slug). Navigation, breadcrumbs, sitemap and hreflang derive from it.
- **Pages.** Front matter: `title`, `navTitle`, `description` (max 200 characters), `lead`, `illustration`, `cta`, `features`, `facts`, `links`, `draft`, `updated`. Create the page in both languages.
- **Drafts.** `draft: true` shows a Draft badge, sets `noindex` and keeps the page out of the sitemap.
- **Feature rows.** A feature with `video` or `image` renders as an alternating media row, otherwise as a card.
- **Media.** Videos live in `public/media/<name>.mp4` with a `<name>.webp` poster, muted and looping. Names starting with `demo-` mean real footage (no badge), names ending in `-wide` use a 16:9 frame. AI-generated visuals carry an "Illustrative" label. Keep every asset web-optimized.
- **Brand wall.** `src/data/clients.ts` lists the brands. Place an official SVG at `public/brand/clients/<slug>.svg` to replace the text wordmark.
- **Job board.** The open positions page loads roles from the public Greenhouse job board API at build time. No client script, no cookies. A daily scheduled deploy keeps the list current. Override the board with the `GREENHOUSE_BOARD` environment variable.

## Editing content (CMS)

1. Open [app.pagescms.org](https://app.pagescms.org) and sign in with GitHub.
2. Choose this repository and the `main` branch. Editors need write access.
3. Edit an entry per language and save. Saving commits to `main` and triggers a deploy.

For review, edit on a branch and open a pull request. See [CONTRIBUTING.md](CONTRIBUTING.md).

## Configuration

Set in Settings > Secrets and variables > Actions > Variables. All are optional, nothing is hardcoded.

| Variable | Purpose |
|---|---|
| `PUBLIC_FORM_ENDPOINT` | Public form provider URL (for example Formspree or Web3Forms). Without it the form falls back to mailto. |
| `PUBLIC_CONTACT_EMAIL` | Address used by the mailto fallback. |
| `PUBLIC_ANALYTICS_DOMAIN` | Enables Plausible analytics when set. Off by default. |
| `PUBLIC_ANALYTICS_SRC` | Custom analytics script URL. |

Values are embedded in the built site. Use public endpoints only, never secret keys.

## CI/CD

- `ci.yml` runs on pull requests and pushes: type check, build, link check, axe and Lighthouse.
- `deploy.yml` builds and publishes `dist/` to GitHub Pages on every push to `main`, on manual dispatch and once a day.
- Pages must use the "GitHub Actions" source.
- `main` is protected: the `quality` check must pass.

### Optional preview protection

If the repository secret `PREVIEW_PASSWORD` exists, the deploy encrypts the HTML with [StatiCrypt](https://github.com/robinmoisson/staticrypt) and blocks crawlers. Delete the secret and re-run Deploy to go public. Images, CSS and the repository itself remain public.

## Domain and DNS

The site is served from the apex domain with `public/CNAME`. Point DNS to GitHub Pages:

| Type | Name | Value |
|---|---|---|
| A | @ | 185.199.108.153, 185.199.109.153, 185.199.110.153, 185.199.111.153 |
| AAAA | @ | 2606:50c0:8000::153, 2606:50c0:8001::153, 2606:50c0:8002::153, 2606:50c0:8003::153 |
| CNAME | www | tommodore.github.io |

Then set the custom domain in Settings > Pages and enable "Enforce HTTPS" once the certificate is issued. `www` redirects to the apex.

## Redirects from the previous site

GitHub Pages cannot send HTTP 301s. `docs/redirects.csv` maps legacy URLs to their new paths. Apply it at the host that serves the legacy domain.

## Rollback

Revert the faulty commit on `main` and push, or re-run an earlier successful Deploy run in the Actions tab.

## Security and confidentiality

This repository is public. Do not commit secrets, credentials, customer data, pricing or internal documents. Report security issues privately through GitHub security advisories.

## Licensing and brands

Code and content are the property of PARADOX CAT GmbH unless noted otherwise. Third-party brand names and logos belong to their respective owners. The corporate typeface is licensed and not part of this repository; Inter Variable is used instead. The open-source engine Ramses3D is published separately under its own license.
