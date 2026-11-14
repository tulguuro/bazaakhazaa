// Removes repeated content from a printed book's HTML. The book reads one
// person's numbers from many sides, so the same energy comes back in several
// chapters and the same sentence (or one with the same meaning) is printed
// again. Reading in page order, a sentence already printed earlier is dropped;
// a paragraph left empty is dropped too, and a long one is replaced by a short
// pointer to the part where it was first read. Source notes, blessings and
// pointers are left alone.
const BLOCK = /<(h2)\b[^>]*>([\s\S]*?)<\/h2>|<(p|li|dd|td)\b([^>]*)>([\s\S]*?)<\/\3>/g;
const KEEP_CLASS = /\b(?:src|soft|kicker|blessing|more|ptitle)\b/;
const KEEP_TEXT = /^(?:Эх сурвалж|Судлаач)/;
const strip = (s) => s.replace(/<[^>]+>/g, '').replace(/&[a-z#0-9]+;/g, ' ');
const norm = (s) => strip(s).toLowerCase().replace(/[^а-яөүё]+/g, ' ').trim();
const stems = (s) => new Set(norm(s).split(' ').filter((w) => w.length > 3).map((w) => w.slice(0, 5)));
const sentences = (text) => text.split(/(?<=[.!?])\s+(?=[А-ЯӨҮЁ«])/);

export function dedupeBook(html, { near = 0.7, minWords = 6, log = null } = {}) {
  const head = html.indexOf('<body');
  if (head < 0) return { html, removed: 0 };
  const seen = new Map(); // normalised sentence → part title
  const sets = []; // [stem set, part title]
  const index = new Map(); // stem → indices into sets
  let part = '';
  let removed = 0;
  const known = (s) => {
    const key = norm(s);
    if (key.length < 40) return null;
    if (seen.has(key)) return seen.get(key);
    const w = stems(s);
    if (w.size < minWords) return null;
    const count = new Map();
    for (const x of w) for (const i of index.get(x) ?? []) count.set(i, (count.get(i) ?? 0) + 1);
    for (const [i, c] of count) {
      const other = sets[i][0];
      if (c / (w.size + other.size - c) >= near) return sets[i][1];
    }
    return null;
  };
  const remember = (s) => {
    const key = norm(s);
    if (key.length < 40) return;
    seen.set(key, part);
    const w = stems(s);
    if (w.size < minWords) return;
    sets.push([w, part]);
    for (const x of w) { if (!index.has(x)) index.set(x, []); index.get(x).push(sets.length - 1); }
  };
  const body = html.slice(head).replace(BLOCK, (all, h2, h2text, tag, attrs, inner) => {
    if (h2) { part = strip(h2text).replace(/\s+/g, ' ').trim(); return all; }
    if (KEEP_CLASS.test(attrs) || KEEP_TEXT.test(strip(inner).trim())) return all;
    if (inner.includes('<')) {
      // inline markup: only a whole repeated paragraph is dropped
      const where = known(inner);
      if (where !== null && strip(inner).length > 60) { removed += 1; log?.push([part, where, strip(inner)]); return ''; }
      remember(inner);
      return all;
    }
    const parts = sentences(inner);
    // a one-sentence meta line (a chapter's question) is the chapter's own
    if ((tag === 'dd' || tag === 'td') && parts.length < 2) { remember(inner); return all; }
    const kept = [];
    let firstWhere = null;
    for (const s of parts) {
      const where = known(s);
      if (where !== null) { removed += 1; firstWhere ??= where; log?.push([part, where, strip(s)]); continue; }
      remember(s);
      kept.push(s);
    }
    if (kept.length === parts.length) return all;
    if (tag === 'dd' || tag === 'td') return kept.length ? `<${tag}${attrs}>${kept.join(' ')}</${tag}>` : all;
    // a paragraph that is mostly a repeat goes whole, so no stray fragment is left
    if (kept.length && kept.join(' ').length > strip(inner).length * 0.4) return `<${tag}${attrs}>${kept.join(' ')}</${tag}>`;
    if (tag === 'p' && strip(inner).length > 200 && firstWhere)
      return `<p class="soft">Энэ тайлбарыг «${firstWhere}» хэсгээс уншина уу.</p>`;
    return '';
  });
  return { html: html.slice(0, head) + body, removed };
}
