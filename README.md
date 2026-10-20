# PARADOX CAT website

Static site built with [Astro](https://astro.build), content in Markdown, edited through [Pages CMS](https://pagescms.org), hosted on GitHub Pages at https://paradox.cat. English (default) and German.

## Local development

```bash
npm ci
npm run dev        # http://localhost:4321
npm run build      # static output in dist/
npm run check      # type check
npm run preview    # serve dist/ on :4321, then:
npm run test:links # internal link check
npm run test:a11y  # axe, WCAG 2 AA
npm run test:lhci  # Lighthouse, all categories >= 0.95
```

Requires Node 24 or newer (npm 11, matches the lockfile).

## Structure

- `src/lib/routes.ts`: sitemap, slugs and hierarchy (EN and DE). Single source of truth for URLs.
- `src/content/{pages,cases,insights,team,jobs}/{en,de}/<slug>.md`: content. Use the same slug in both languages.
- `src/components/`, `src/styles/tokens.css`: design system, see [DESIGN.md](DESIGN.md). Live specimens at `/design-system/` (noindex).
- `public/`: CNAME, robots.txt, llms.txt, brand assets.
- `illustrations.md`: manifest of generated images.

## Editing content (CMS)

1. Open https://app.pagescms.org and sign in with GitHub.
2. Choose this repository and the `main` branch. Editors need write access to the repo.
3. Edit Pages, Case studies, Insights, Team or Jobs. Each entry exists per language.
4. Saving commits to `main` and triggers the deploy (about 2 minutes). For review, edit on a branch and open a PR.

Drafts: `draft: true` shows a Draft badge, sets noindex and keeps the page out of the sitemap. Set it to false to publish. `template: true` marks the sample case study. `gate: true` shows the email gate (see below).

## Deployment

GitHub Actions: `ci.yml` runs on every PR (type check, build, links, axe, Lighthouse). `deploy.yml` publishes `dist/` to GitHub Pages on every push to `main`.

### Variables to set

Settings > Secrets and variables > Actions > Variables. All optional, nothing is hardcoded.

| Variable | Purpose |
|---|---|
| `PUBLIC_FORM_ENDPOINT` | Form provider URL (Formspree or Web3Forms). Without it the form falls back to mailto. |
| `PUBLIC_CONTACT_EMAIL` | Address for the mailto fallback. |
| `PUBLIC_ANALYTICS_DOMAIN` | Enables Plausible analytics when set. Off by default. |
| `PUBLIC_ANALYTICS_SRC` | Custom analytics script URL (optional). |

Form values are public in the built site, so use a public form endpoint, never a secret key.

### Email gate

A static site cannot truly protect a file. The gate collects an email through the form provider, whose autoresponder sends the deck link. Never put the deck URL into the site.

## Password-protected preview

While the secret `PREVIEW_PASSWORD` exists (Settings > Secrets and variables > Actions > Secrets), the deploy encrypts every HTML page with StatiCrypt (AES in the browser) and blocks crawlers. Visitors see a password prompt, the choice is remembered for 30 days. To go public, delete the secret and re-run Deploy. Images, CSS and the repo source stay public, so keep confidential content out of the repo.

## DNS for paradox.cat

First detach paradox.cat from its old Cloudflare Pages project. Then set at the registrar or DNS host:

| Type | Name | Value |
|---|---|---|
| A | @ | 185.199.108.153 |
| A | @ | 185.199.109.153 |
| A | @ | 185.199.110.153 |
| A | @ | 185.199.111.153 |
| AAAA | @ | 2606:50c0:8000::153 |
| AAAA | @ | 2606:50c0:8001::153 |
| AAAA | @ | 2606:50c0:8002::153 |
| AAAA | @ | 2606:50c0:8003::153 |
| CNAME | www | tommodore.github.io |

Then in Settings > Pages set the custom domain to `paradox.cat` and tick "Enforce HTTPS" once the certificate is issued. `www` redirects to the apex automatically.

## Launch checklist

- [ ] DNS set, HTTPS enforced
- [ ] Imprint and privacy texts filled in (`/company/legal/`)
- [ ] Form endpoint and contact email set, test submission received
- [ ] Analytics ID set, or left off
- [ ] Real cases, demos and team replace placeholders; drafts switched off
- [ ] Generated images replaced where real material exists
- [ ] Search Console: add property, submit `https://paradox.cat/sitemap-index.xml`
- [ ] Redirects from paradoxcat.com configured (see below)

## Redirects from the old site

GitHub Pages cannot send 301s. `docs/redirects.csv` maps all old WordPress URLs to new ones. Apply it at the host that serves paradoxcat.com (for example as Cloudflare bulk redirects) when that domain points to the new site.

## Rollback

Revert the faulty commit on `main` (`git revert <sha>`, push). The deploy workflow republishes the previous state. Or re-run an earlier successful Deploy run in the Actions tab.

## Privacy

No cookies, no third-party trackers, self-hosted fonts. The identity font Graphit is licensed and not in this repo. Inter Variable is used instead (see DESIGN.md).
