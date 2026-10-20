# Design system

Dark theme only. Cinematic, calm, premium: the work is the hero, the UI stays secondary. Live specimens: `/design-system/`.

## Tokens

All in `src/styles/tokens.css` as CSS custom properties: surfaces, text, brand and state colors, type scale, spacing (4 px base), radius, elevation and glow, motion durations and easings, layout widths. Never hardcode values in components.

Brand colors from the existing identity: primary `#548CFF`, secondary `#364C94`, navy `#011826`, accent lime `#BFD92E`. All text pairs meet WCAG AA (measured on the design-system page).

## Typography

The identity font is Graphit (licensed, not committed). The site uses Inter Variable, self-hosted via `@fontsource-variable/inter`. To use Graphit: add the licensed woff2 files to `public/fonts/`, declare `@font-face` in `global.css` and put `'Graphit'` first in `--font-sans`.

## Logo

White logo on dark only. Keep the 1.85:1 ratio and clear space. Header and favicon use the cat mark only, the footer the full logo. Never stretch, recolor, or place on busy imagery without a dark overlay. Do not use the black variant on this theme.

## Motion

Slow, eased, camera-like (dolly, drift, fade). Scroll reveals use CSS scroll-driven animation. Everything stops under `prefers-reduced-motion`. No hard cuts, spinners or modals.

## Components

Header (mega menu, mobile drawer), Footer, Hero, Section, Card, CaseCard, Stat, LogoWall, CtaBand, ContactForm, Tabs, Accordion, Badge, Breadcrumbs, LangSwitch, Media, Gate. Zero client JavaScript except the mobile drawer and UTM capture.

## Images

Generated images show an "Illustrative" badge and say "illustrative" in alt text. Manifest in `illustrations.md`. Use `Media`, which outputs AVIF/WebP with width, height and lazy loading.

## Accessibility

Visible focus ring, skip link, keyboard-operable menus, correct `lang` and hreflang, contrast AA. CI enforces axe (WCAG 2 AA) and Lighthouse >= 95. Axe cannot measure text over photographic backgrounds and reports them as "needs review" (warnings): these sit under a dark gradient overlay and must be checked by eye when imagery changes.
