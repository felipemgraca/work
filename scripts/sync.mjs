// Reads the Obsidian vault and writes src/data/*.json for the site build.
// Run locally: npm run sync   (VAULT_PATH overrides the default location)
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import matter from 'gray-matter';
import { marked } from 'marked';

const VAULT =
  process.env.VAULT_PATH ||
  '/Users/felipegraca/Library/Mobile Documents/iCloud~md~obsidian/Documents/obsidian';
const OUT = path.resolve('src/data');
fs.mkdirSync(OUT, { recursive: true });

const slugify = (s) =>
  s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’']/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '');

const readDir = (rel) => {
  const dir = path.join(VAULT, rel);
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => {
      const raw = fs.readFileSync(path.join(dir, f), 'utf8');
      const { data, content } = matter(raw);
      const title = f.replace(/\.md$/, '');
      return { title, slug: slugify(title), data, content: content.trim() };
    });
};

const notes = readDir('02 - Branches');
const refs = readDir('03 - Roots/Books/Highlighted');
const posts = readDir('01 - Fruits');

// Wikilink resolution: only notes and highlighted books are public.
const targets = new Map();
for (const n of notes) targets.set(n.title.toLowerCase(), { kind: 'notes', ...n });
for (const r of refs) targets.set(r.title.toLowerCase(), { kind: 'references', ...r });
const hrefFor = (t) => `/knowledge-tree/${t.kind === 'notes' ? 'branches' : 'roots'}/${t.slug}/`;

const edges = new Set();
const backlinks = new Map();

function convert(item, kind) {
  let md = item.content;
  // Embeds: essays keep their images (copied into public/); everywhere else embeds are dropped.
  md = md.replace(/!\[\[([^\]]*)\]\]/g, (_, inner) => {
    if (kind !== 'posts') return '';
    const file = inner.split('|')[0].trim();
    if (!/\.(png|jpe?g|gif|webp)$/i.test(file)) return '';
    const src = path.join(VAULT, 'Attachments', file);
    if (!fs.existsSync(src)) return '';
    const ext = path.extname(file).toLowerCase();
    item.images = item.images || [];
    const name = `${item.slug}-${item.images.length + 1}${ext}`;
    const destDir = path.resolve('public/images/essays');
    fs.mkdirSync(destDir, { recursive: true });
    const dest = path.join(destDir, name);
    try {
      execFileSync('sips', ['--resampleWidth', '1600', src, '--out', dest], { stdio: 'ignore' });
    } catch {
      fs.copyFileSync(src, dest);
    }
    const href = `@@BASE@@/images/essays/${name}`;
    item.images.push(href);
    return `![](${href})`;
  });
  md = md.replace(/\[\[([^\]]+)\]\]/g, (_, inner) => {
    const [targetPart, alias] = inner.split('|');
    const name = targetPart.split('#')[0].trim();
    const t = targets.get(name.toLowerCase());
    if (!t) return alias || name; // unresolved or private: plain text
    if (kind !== 'posts') {
      edges.add(`${kind}:${item.slug}->${t.kind}:${t.slug}`);
      const key = `${t.kind}:${t.slug}`;
      if (!backlinks.has(key)) backlinks.set(key, new Set());
      backlinks.get(key).add(`${kind}:${item.slug}`);
    }
    return `[${alias || t.title}](@@BASE@@${hrefFor(t)})`;
  });
  md = md.replace(/==([^=\n]+)==/g, '<mark>$1</mark>');
  return md;
}

const render = (md) => marked.parse(md, { gfm: true, breaks: false });

const notesOut = notes.map((n) => ({ ...n, md: convert(n, 'notes') }));
const refsOut = refs.map((r) => ({ ...r, md: convert(r, 'references') }));
const postsOut = posts.map((p) => {
  const md = convert(p, 'posts');
  return { ...p, md, images: p.images || [] };
});

const byKey = new Map();
for (const n of notesOut) byKey.set(`notes:${n.slug}`, n);
for (const r of refsOut) byKey.set(`references:${r.slug}`, r);

const toEntry = (kind) => (x) => {
  const bl = [...(backlinks.get(`${kind}:${x.slug}`) || [])]
    .map((k) => byKey.get(k))
    .filter(Boolean)
    .map((b) => ({ title: b.title, slug: b.slug, kind: k2kind(b) }));
  return {
    title: x.title,
    slug: x.slug,
    date: x.data.date ? String(x.data.date instanceof Date ? x.data.date.toISOString().slice(0, 10) : x.data.date) : null,
    html: render(x.md),
    backlinks: bl,
  };
};
const k2kind = (x) => (notesOut.includes(x) ? 'notes' : 'references');

const plain = (t) =>
  t
    .replace(/<[^>]+>/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[*_`>#]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
const clip = (t, n) => (t.length <= n ? t : t.slice(0, n).replace(/\s+\S*$/, '') + '…');

const writingEntries = postsOut
  .map((p) => {
    const m = p.title.match(/^(\d{4}-\d{2}-\d{2}) - (.*)$/);
    const fm = p.data.date && String(p.data.date instanceof Date ? p.data.date.toISOString().slice(0, 10) : p.data.date);
    // A standalone YYYY-MM-DD line in the note is its publish date; shown in the UI, so dropped from the body.
    const dateLines = [...p.md.matchAll(/^[ \t]*(\d{4}-\d{2}-\d{2})[ \t]*$/gm)];
    const lastDate = dateLines.length ? dateLines[dateLines.length - 1] : null;
    const body = lastDate ? p.md.slice(0, lastDate.index) + p.md.slice(lastDate.index + lastDate[0].length) : p.md;
    // The first line of an essay is its subtitle; the next plain paragraph is the card excerpt.
    const blocks = body.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
    const hasSubtitle = blocks[0] && !/\n/.test(blocks[0]) && blocks[0].length <= 200 && !/^[#!\-*>]/.test(blocks[0]);
    const subtitle = hasSubtitle ? plain(blocks[0]) : '';
    const rest = hasSubtitle ? blocks.slice(1) : blocks;
    const excerptBlock = rest.find((b) => !/^[#!\-*>\d]/.test(b));
    return {
      title: m ? m[2] : p.title,
      slug: slugify(m ? m[2] : p.title),
      date: lastDate ? lastDate[1] : m ? m[1] : fm || null,
      subtitle,
      cover: p.images[0] || null,
      excerpt: excerptBlock ? clip(plain(excerptBlock), 190) : '',
      html: render(rest.join('\n\n')),
    };
  })
  .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

const noteEntries = notesOut.map(toEntry('notes')).sort((a, b) => a.title.localeCompare(b.title));
// Book content (highlights, notes) is never published: references expose title and backlinks only.
const refEntries = refsOut
  .map(toEntry('references'))
  .map((r) => ({ ...r, html: '', date: null }))
  .sort((a, b) => a.title.localeCompare(b.title));

// Graph
const deg = new Map();
const nodeIds = new Set([...notesOut.map((n) => `notes:${n.slug}`), ...refsOut.map((r) => `references:${r.slug}`)]);
const links = [...edges]
  .map((e) => e.split('->'))
  .filter(([a, b]) => a !== b && nodeIds.has(a) && nodeIds.has(b))
  .map(([source, target]) => ({ source, target }));
for (const l of links) {
  deg.set(l.source, (deg.get(l.source) || 0) + 1);
  deg.set(l.target, (deg.get(l.target) || 0) + 1);
}
const nodes = [...nodeIds].map((id) => {
  const [kind, slug] = id.split(':');
  const x = byKey.get(id);
  return { id, kind, slug, title: x.title, degree: deg.get(id) || 0 };
});

// Resume / profile come from one note
const resumeFile = path.join(VAULT, '03 - Roots/Field Notes/2026-11-02 - my professional experiences.md');
const { content: resumeRaw } = matter(fs.readFileSync(resumeFile, 'utf8'));
const cut = resumeRaw.split(/\n---\n/)[0]; // drop everything below the first separator (additional experiences etc.)
const headline = (cut.match(/^\*\*(.+)\*\*\s*$/m) || [])[1] || '';
const trimPlace = (t) => t.replaceAll(', Ontario,', ',').replaceAll(', Federal District,', ','); // city + country only
const location = trimPlace((cut.match(/^(?!\*\*|#|-|\s*$)([A-Z][^\n]*Canada)\s*$/m) || [])[1] || '');
// The site owns the About text shown on the Resume page; fall back to the vault note if the file is missing.
const aboutFile = path.resolve('content/resume-about.md');
const aboutMd = fs.existsSync(aboutFile)
  ? fs.readFileSync(aboutFile, 'utf8').trim()
  : (cut.match(/## About\n([\s\S]*?)\n## Experience/) || [])[1]?.trim() || '';
// My Story page: the body of one vault note, rendered as-is.
const storyFile = path.join(VAULT, '03 - Roots/Field Notes/2026-11-19 - my story for my website.md');
const storyMd = matter(fs.readFileSync(storyFile, 'utf8')).content.trim();
// Display names used on the site (the vault note keeps the long forms).
const renames = [
  ['UniCEUB - University Center of Brasília (Centro Universitário de Brasília)', 'University Center of Brasília'],
  ['Barroso Fontelles, Barcellos, Mendonça Advogados', 'BFBM Advogados'],
];
const rest = renames.reduce((t, [from, to]) => t.replaceAll(from, to), trimPlace(cut.slice(cut.indexOf('## Experience')).trim()));


// In Experience, the summary line under each role/date becomes the first bullet of that role.
function bulletSummaries(md) {
  const at = md.indexOf('\n## Education');
  const exp = at === -1 ? md : md.slice(0, at);
  const tail = at === -1 ? '' : md.slice(at);
  const lines = exp.split('\n');
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const isRole = /^\*\*.+\*\*\s*$/.test(lines[i]);
    const third = lines[i + 2];
    if (isRole && lines[i + 1] && third && !/^[-#*]/.test(third) && third.trim()) {
      out.push(lines[i], lines[i + 1], '', '- ' + third);
      i += 2;
    } else {
      out.push(lines[i]);
    }
  }
  return out.join('\n') + tail;
}

// Skills sit right after the About summary, ahead of Experience.
function skillsFirst(md) {
  const at = md.indexOf('## Skills');
  if (at === -1) return md;
  const skills = md.slice(at).trim().replace(/^Others listed:\s*/m, ''); // drop the "Others listed:" label
  const others = md.slice(0, at).trim();
  return skills + '\n\n' + others;
}

const data = {
  site: { name: 'Felipe Graca', linkedin: 'https://www.linkedin.com/in/felipemenesesgraca/' },
  // Site headline (shorter than the LinkedIn one in the vault note).
  profile: { headline: 'Analytics Manager | WPP @ Ford | Building marketing intelligence & AI-BI solutions', location, aboutHtml: render(aboutMd) },
  storyHtml: render(storyMd),
  resumeHtml: marked.parse(skillsFirst(bulletSummaries(rest)), { gfm: true, breaks: true }), // keep line breaks (role / dates)
  writing: writingEntries,
  notes: noteEntries,
  references: refEntries,
  graph: { nodes, links },
};

const finalize = (o) => JSON.parse(JSON.stringify(o)); // no-op copy
fs.writeFileSync(path.join(OUT, 'site.json'), JSON.stringify(finalize(data)).replaceAll('@@BASE@@', '__BASE__'));
console.log(
  `writing:${writingEntries.length} notes:${noteEntries.length} references:${refEntries.length} nodes:${nodes.length} links:${links.length}`,
);
console.log('headline:', headline, '| location:', location);
