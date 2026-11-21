import raw from './data/site.json';

export const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');
export const url = (p: string) => `${BASE}${p}`;
const fix = (s: string) => s.replaceAll('__BASE__', BASE);

export const data = raw as any;
export const writing = data.writing.map((w: any) => ({ ...w, html: fix(w.html), cover: w.cover ? fix(w.cover) : null }));
export const notes = data.notes.map((n: any) => ({ ...n, html: fix(n.html) }));
export const references = data.references.map((r: any) => ({ ...r, html: fix(r.html) }));
export const storyHtml: string = fix(data.storyHtml);
export const resumeHtml: string = fix(data.resumeHtml);
export const profile = { ...data.profile, aboutHtml: fix(data.profile.aboutHtml) };
export const site = data.site;
export const graph = data.graph;

export const fmtDate = (d?: string | null) =>
  d ? new Date(d + 'T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '';

export const sectionOf = { posts: 'fruits', notes: 'branches', references: 'roots' } as const;
export const pathFor = (kind: keyof typeof sectionOf, slug: string) => `/knowledge-tree/${sectionOf[kind]}/${slug}/`;
