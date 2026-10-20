export const locales = ['en', 'de'] as const;
export type Lang = (typeof locales)[number];
export const defaultLang: Lang = 'en';
export const SITE = 'https://paradox.cat';

export interface RouteNode {
  id: string;
  parent?: string;
  slug: Record<Lang, string>;
}

// [id, parent, en slug, de slug]
const T: [string, string | undefined, string, string][] = [
  ['home', undefined, '', ''],
  ['solutions', 'home', 'solutions', 'loesungen'],
  ['services', 'solutions', 'services', 'leistungen'],
  ['hmi', 'services', 'hmi', 'hmi'],
  ['aaos', 'hmi', 'android-automotive-aaos-sdv', 'android-automotive-aaos-sdv'],
  ['apps', 'hmi', 'apps-and-connectivity', 'apps-und-konnektivitaet'],
  ['ui-frameworks', 'hmi', 'ui-frameworks', 'ui-frameworks'],
  ['graphics', 'services', 'real-time-3d-graphics', 'echtzeit-3d-grafik'],
  ['cad', 'graphics', 'cad-to-realtime-pipeline', 'cad-zu-echtzeit-pipeline'],
  ['shaders', 'graphics', 'custom-shaders', 'custom-shader'],
  ['configurators', 'graphics', 'configurators', 'konfiguratoren'],
  ['twins', 'services', 'digital-twins', 'digitale-zwillinge'],
  ['product-twins', 'twins', 'product-and-vehicle-twins', 'produkt-und-fahrzeug-zwillinge'],
  ['industrial-twins', 'twins', 'industrial-and-machine-twins', 'industrie-und-maschinen-zwillinge'],
  ['training', 'twins', 'training-and-service', 'training-und-service'],
  ['xr', 'twins', 'xr-ar-vr', 'xr-ar-vr'],
  ['sensing', 'services', 'ai-in-cabin-sensing', 'ki-innenraumsensorik'],
  ['packages', 'services', 'packages', 'pakete'],
  ['products', 'solutions', 'products', 'produkte'],
  ['ramses3d', 'products', 'ramses3d', 'ramses3d'],
  ['more', 'products', 'more-from-us', 'mehr-von-uns'],
  ['industries', 'home', 'industries', 'branchen'],
  ['automotive', 'industries', 'automotive', 'automobil'],
  ['industrial', 'industries', 'industrial', 'industrie'],
  ['fintech', 'industries', 'fintech', 'fintech'],
  ['aviation-marine', 'industries', 'aviation-and-marine', 'luftfahrt-und-schifffahrt'],
  ['defense', 'industries', 'defense-and-critical-infrastructure', 'verteidigung-und-kritische-infrastruktur'],
  ['public-sector', 'industries', 'public-sector', 'oeffentlicher-sektor'],
  ['why', 'home', 'why-paradoxcat', 'warum-paradoxcat'],
  ['case-studies', 'why', 'case-studies', 'referenzen'],
  ['demos', 'why', 'demos', 'demos'],
  ['numbers', 'why', 'numbers-and-approach', 'zahlen-und-vorgehen'],
  ['technology', 'why', 'technology-and-partners', 'technologie-und-partner'],
  ['insights', 'why', 'insights', 'einblicke'],
  ['careers', 'home', 'careers', 'karriere'],
  ['open-positions', 'careers', 'open-positions', 'offene-stellen'],
  ['life', 'careers', 'life-at-paradoxcat', 'leben-bei-paradoxcat'],
  ['careers-locations', 'careers', 'locations', 'standorte'],
  ['company', 'home', 'company', 'unternehmen'],
  ['about', 'company', 'about', 'ueber-uns'],
  ['team', 'company', 'team', 'team'],
  ['company-locations', 'company', 'locations', 'standorte'],
  ['news', 'company', 'news', 'neuigkeiten'],
  ['legal', 'company', 'legal', 'rechtliches'],
  ['imprint', 'legal', 'imprint', 'impressum'],
  ['privacy', 'legal', 'privacy', 'datenschutz'],
  ['contact', 'home', 'contact', 'kontakt'],
];

export const nodes: RouteNode[] = T.map(([id, parent, en, de]) => ({ id, parent, slug: { en, de } }));
const byId = new Map(nodes.map((n) => [n.id, n]));

export function node(id: string): RouteNode {
  const n = byId.get(id);
  if (!n) throw new Error(`Unknown route id: ${id}`);
  return n;
}

export function childrenOf(id: string): RouteNode[] {
  return nodes.filter((n) => n.parent === id);
}

export function ancestorsOf(id: string): RouteNode[] {
  const out: RouteNode[] = [];
  let cur = byId.get(id)?.parent;
  while (cur) {
    out.unshift(node(cur));
    cur = node(cur).parent;
  }
  return out;
}

export function segments(id: string, lang: Lang): string[] {
  return [...ancestorsOf(id), node(id)].map((n) => n.slug[lang]).filter(Boolean);
}

export function pathOf(id: string, lang: Lang): string {
  const prefix = lang === defaultLang ? '' : `/${lang}`;
  const segs = segments(id, lang);
  return `${prefix}/${segs.length ? segs.join('/') + '/' : ''}`;
}

export function absoluteUrl(path: string): string {
  return new URL(path, SITE).toString();
}

export function otherLang(lang: Lang): Lang {
  return lang === 'en' ? 'de' : 'en';
}

export function homePath(lang: Lang): string {
  return pathOf('home', lang);
}
