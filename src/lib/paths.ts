import { getCollection } from 'astro:content';
import { nodes, segments, pathOf, node, type Lang } from './routes';
import { slugOf } from './content';

export interface RouteProps {
  kind: 'page' | 'case' | 'insight';
  id: string;
  slug?: string;
}

// Static paths for one language. Home maps to an undefined rest parameter.
export async function buildPaths(lang: Lang) {
  const paths: { params: { path: string | undefined }; props: RouteProps }[] = [];
  const param = (segs: string[]) => (segs.length ? segs.join('/') : undefined);

  for (const n of nodes) paths.push({ params: { path: param(segments(n.id, lang)) }, props: { kind: 'page', id: n.id } });

  for (const [coll, parent, kind] of [
    ['cases', 'case-studies', 'case'],
    ['insights', 'insights', 'insight'],
  ] as const) {
    for (const e of await getCollection(coll)) {
      if (!e.id.startsWith(`${lang}/`)) continue;
      const slug = slugOf(e.id);
      paths.push({ params: { path: param([...segments(parent, lang), slug]) }, props: { kind, id: parent, slug } });
    }
  }
  return paths;
}

export function detailPath(parentId: string, slug: string, lang: Lang) {
  return `${pathOf(parentId, lang)}${slug}/`;
}

export { node };
