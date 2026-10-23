// Build-time fetch of the public Greenhouse job board API. No client script, no cookies.
// If the API is unreachable the build continues with an empty list.
const BOARD = import.meta.env.GREENHOUSE_BOARD || 'paradoxcatgmbh';

export interface GhJob {
  id: number;
  title: string;
  location: string;
  department: string;
  url: string;
  published: string;
  descriptionHtml: string;
}

const decode = (s: string) =>
  s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');

let cache: Promise<GhJob[]> | undefined;

export function greenhouseJobs(): Promise<GhJob[]> {
  cache ??= (async () => {
    try {
      const res = await fetch(`https://boards-api.greenhouse.io/v1/boards/${BOARD}/jobs?content=true`, {
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { jobs: any[] };
      return data.jobs.map((j) => ({
        id: j.id,
        title: j.title,
        location: j.location?.name ?? '',
        department: j.departments?.[0]?.name ?? '',
        url: j.absolute_url,
        published: String(j.first_published ?? j.updated_at).slice(0, 10),
        descriptionHtml: decode(j.content ?? ''),
      }));
    } catch (e) {
      console.warn(`[greenhouse] could not load jobs: ${e}`);
      return [];
    }
  })();
  return cache;
}
