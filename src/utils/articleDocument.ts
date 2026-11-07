import { z } from 'zod';

export const ARTICLE_DOCUMENT_PREFIX = 'ESCEN_ARTICLE_V1\n';
const httpsUrl = z.string().max(2048).url().refine(value => new URL(value).protocol === 'https:');
const inlineSchema = z.object({ text: z.string().max(50000), bold: z.boolean().optional(), italic: z.boolean().optional(), underline: z.boolean().optional(), href: httpsUrl.optional() }).strict();
const textBlock = { content: z.array(inlineSchema).max(5000) };
export const articleDocumentSchema = z.object({ blocks: z.array(z.discriminatedUnion('type', [
  z.object({ type: z.literal('paragraph'), ...textBlock }).strict(),
  z.object({ type: z.literal('heading'), level: z.union([z.literal(2), z.literal(3)]), ...textBlock }).strict(),
  z.object({ type: z.literal('quote'), ...textBlock }).strict(),
  z.object({ type: z.literal('list'), ordered: z.boolean(), items: z.array(z.array(inlineSchema).max(5000)).max(500) }).strict(),
  z.object({ type: z.literal('image'), src: httpsUrl, alt: z.string().trim().min(1).max(500) }).strict(),
])).max(1000) }).strict();
export type ArticleDocument = z.infer<typeof articleDocumentSchema>;
export type ArticleInline = z.infer<typeof inlineSchema>;
export const escapeArticleText = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!));

export function parseArticleDocument(value: string): ArticleDocument | null {
  if (!value.startsWith(ARTICLE_DOCUMENT_PREFIX)) return null;
  try { return articleDocumentSchema.parse(JSON.parse(value.slice(ARTICLE_DOCUMENT_PREFIX.length))); } catch { return null; }
}

export function articlePlainText(value: string): string {
  const document = parseArticleDocument(value);
  if (!document) return value.startsWith(ARTICLE_DOCUMENT_PREFIX) ? '' : value;
  return document.blocks.map(block => block.type === 'image' ? '' : block.type === 'list' ? block.items.map(item => item.map(run => run.text).join('')).join('\n') : block.content.map(run => run.text).join('')).join('\n\n');
}

/** The only HTML emitted is generated from validated nodes; raw HTML is never interpreted. */
export function renderArticleContent(value: string): string {
  const document = parseArticleDocument(value);
  if (!document && value.startsWith(ARTICLE_DOCUMENT_PREFIX)) return '';
  if (!document) return (value.startsWith(ARTICLE_DOCUMENT_PREFIX) ? '' : value).split(/\n\s*\n/).map(paragraph => `<p>${escapeArticleText(paragraph).replaceAll('\n', '<br>')}</p>`).join('');
  const inline = (runs: ArticleInline[]) => runs.map(run => {
    let html = escapeArticleText(run.text).replaceAll('\n', '<br>');
    if (run.bold) html = `<strong>${html}</strong>`;
    if (run.italic) html = `<em>${html}</em>`;
    if (run.underline) html = `<u>${html}</u>`;
    if (run.href) html = `<a href="${escapeArticleText(run.href)}" target="_blank" rel="noopener noreferrer">${html}</a>`;
    return html;
  }).join('');
  return document.blocks.map(block => {
    if (block.type === 'image') return `<figure><img src="${escapeArticleText(block.src)}" alt="${escapeArticleText(block.alt)}" loading="lazy"></figure>`;
    if (block.type === 'list') { const tag = block.ordered ? 'ol' : 'ul'; return `<${tag}>${block.items.map(item => `<li>${inline(item)}</li>`).join('')}</${tag}>`; }
    const tag = block.type === 'heading' ? `h${block.level}` : block.type === 'quote' ? 'blockquote' : 'p';
    return `<${tag}>${inline(block.content)}</${tag}>`;
  }).join('');
}

/** Browser DOM -> bounded, typed document. Pasted attributes and unsupported elements cannot reach publication. */
export function articleDocumentFromElement(root: HTMLElement): ArticleDocument {
  const blocked = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'SVG', 'MATH', 'TEMPLATE']);
  const safeUrl = (value: string | null) => { try { const url = new URL(value || ''); return url.protocol === 'https:' ? url.href : undefined; } catch { return undefined; } };
  const runs = (node: Node, marks: Omit<ArticleInline, 'text'> = {}): ArticleInline[] => {
    if (node.nodeType === Node.TEXT_NODE) return [{ text: node.textContent || '', ...marks }];
    if (!(node instanceof HTMLElement) || blocked.has(node.tagName)) return [];
    if (node.tagName === 'BR') return [{ text: '\n', ...marks }];
    const next = { ...marks };
    if (['B', 'STRONG'].includes(node.tagName) || Number(node.style.fontWeight) >= 600) next.bold = true;
    if (['I', 'EM'].includes(node.tagName) || node.style.fontStyle === 'italic') next.italic = true;
    if (node.tagName === 'U' || node.style.textDecoration.includes('underline')) next.underline = true;
    if (node.tagName === 'A') next.href = safeUrl(node.getAttribute('href'));
    return Array.from(node.childNodes).flatMap(child => runs(child, next));
  };
  const blocks: ArticleDocument['blocks'] = [];
  const blockTags = new Set(['P', 'DIV', 'H2', 'H3', 'UL', 'OL', 'BLOCKQUOTE', 'FIGURE', 'IMG']);
  const visitChildren = (parent: HTMLElement) => {
    let pending: ArticleInline[] = [];
    const flush = () => { if (pending.some(run => run.text.trim())) blocks.push({ type: 'paragraph', content: pending }); pending = []; };
    parent.childNodes.forEach(child => {
      if (child instanceof HTMLElement && blockTags.has(child.tagName)) { flush(); visit(child); }
      else pending.push(...runs(child));
    });
    flush();
  };
  const visit = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) { if (node.textContent) blocks.push({ type: 'paragraph', content: runs(node) }); return; }
    if (!(node instanceof HTMLElement) || blocked.has(node.tagName)) return;
    const tag = node.tagName;
    if (tag === 'IMG') { const src = safeUrl(node.getAttribute('src')); const alt = node.getAttribute('alt')?.trim(); if (src && alt) blocks.push({ type: 'image', src, alt }); return; }
    if (['UL', 'OL'].includes(tag)) { blocks.push({ type: 'list', ordered: tag === 'OL', items: Array.from(node.children).filter(item => item.tagName === 'LI').map(item => runs(item)) }); return; }
    if (tag === 'H2' || tag === 'H3') { blocks.push({ type: 'heading', level: tag === 'H2' ? 2 : 3, content: runs(node) }); return; }
    if (tag === 'BLOCKQUOTE') { blocks.push({ type: 'quote', content: runs(node) }); return; }
    if (Array.from(node.children).some(child => blockTags.has(child.tagName))) { visitChildren(node); return; }
    blocks.push({ type: 'paragraph', content: runs(node) });
  };
  visitChildren(root);
  return articleDocumentSchema.parse({ blocks });
}
