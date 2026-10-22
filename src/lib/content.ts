import { getCollection, getEntry, type CollectionEntry } from 'astro:content';
import { nodes, childrenOf, pathOf, type Lang } from './routes';

export type PageEntry = CollectionEntry<'pages'>;

export async function getPage(id: string, lang: Lang): Promise<PageEntry> {
  const entry = await getEntry('pages', `${lang}/${id}`);
  if (!entry) throw new Error(`Missing content: src/content/pages/${lang}/${id}.md`);
  return entry;
}

export async function navTitle(id: string, lang: Lang): Promise<string> {
  const p = await getPage(id, lang);
  return p.data.navTitle ?? p.data.title;
}

export interface NavItem {
  id: string;
  label: string;
  href: string;
  children: NavItem[];
}

async function item(id: string, lang: Lang, depth: number): Promise<NavItem> {
  const children = depth > 0 ? await Promise.all(childrenOf(id).filter((c) => c.id !== 'legal').map((c) => item(c.id, lang, depth - 1))) : [];
  return { id, label: await navTitle(id, lang), href: pathOf(id, lang), children };
}

// Top navigation: Solutions | Industries | Capabilities | Work | Careers | Company | Contact
export async function buildNav(lang: Lang): Promise<NavItem[]> {
  const tops = childrenOf('home');
  return Promise.all(tops.map((n) => item(n.id, lang, n.id === 'solutions' ? 2 : 1)));
}

export async function publishedIn<C extends 'cases' | 'insights' | 'jobs' | 'team'>(name: C, lang: Lang, includeDrafts = false) {
  const all = await getCollection(name);
  return all.filter((e) => e.id.startsWith(`${lang}/`) && (includeDrafts || !(e.data as { draft?: boolean }).draft));
}

export const isProd = import.meta.env.PROD;

export function slugOf(entryId: string): string {
  return entryId.split('/').slice(1).join('/');
}

export function allNodeIds(): string[] {
  return nodes.map((n) => n.id);
}
