import { z } from 'zod';

export const ARTICLE_DOCUMENT_PREFIX = 'ESCEN_ARTICLE_V1\n';
const httpsUrl = z.string().max(2048).url().refine(value => new URL(value).protocol === 'https:');

const RASTER_DATA_URL_RE = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/;

function decodeBase64Prefix(base64: string, byteCount = 16): Uint8Array | null {
  const clean = base64.slice(0, Math.min(base64.length, Math.ceil(byteCount / 3) * 4));
  if (clean.length < 16) return null;
  try {
    if (typeof Buffer !== 'undefined') {
      return new Uint8Array(Buffer.from(clean, 'base64'));
    }
    const binary = atob(clean);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

export function sniffRasterImageBytes(bytes: Uint8Array): 'image/jpeg' | 'image/png' | 'image/webp' | undefined {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg';
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 137 &&
    bytes[1] === 80 &&
    bytes[2] === 78 &&
    bytes[3] === 71 &&
    bytes[4] === 13 &&
    bytes[5] === 10 &&
    bytes[6] === 26 &&
    bytes[7] === 10
  ) {
    return 'image/png';
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return 'image/webp';
  }
  return undefined;
}

export function isSafeArticleImageUrl(value: string): boolean {
  if (!value || value.length > 1_500_000) return false;
  if (value.startsWith('/') && !value.startsWith('//') && /^\/[a-zA-Z0-9_\-./]+$/.test(value)) {
    return !value.includes('..') && !value.endsWith('/');
  }
  const match = RASTER_DATA_URL_RE.exec(value);
  if (match) {
    const declaredSubtype = match[1];
    const bytes = decodeBase64Prefix(match[2], 16);
    if (!bytes) return false;
    const sniffed = sniffRasterImageBytes(bytes);
    return sniffed === `image/${declaredSubtype}`;
  }
  if (value.length > 2048) return false;
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

const safeImageSrc = z.string().max(1_500_000).refine(isSafeArticleImageUrl, 'Image d’article invalide.');
const alignEnum = z.enum(['left', 'center', 'right', 'justify']);
const inlineSchema = z.object({ text: z.string().max(50000), bold: z.boolean().optional(), italic: z.boolean().optional(), underline: z.boolean().optional(), href: httpsUrl.optional() }).strict();
const textBlock = { content: z.array(inlineSchema).max(5000), align: alignEnum.optional() };
export const articleDocumentSchema = z.object({ blocks: z.array(z.discriminatedUnion('type', [
  z.object({ type: z.literal('paragraph'), ...textBlock }).strict(),
  z.object({ type: z.literal('heading'), level: z.union([z.literal(2), z.literal(3)]), ...textBlock }).strict(),
  z.object({ type: z.literal('quote'), ...textBlock }).strict(),
  z.object({ type: z.literal('list'), ordered: z.boolean(), items: z.array(z.array(inlineSchema).max(5000)).max(500) }).strict(),
  z.object({ type: z.literal('image'), src: safeImageSrc, alt: z.string().trim().min(1).max(500), align: alignEnum.optional() }).strict(),
])).max(1000) }).strict();
export type ArticleDocument = z.infer<typeof articleDocumentSchema>;
export type ArticleInline = z.infer<typeof inlineSchema>;
export const escapeArticleText = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!));

function bytesToBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== 'undefined') return Buffer.from(bytes).toString('base64');
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

export async function readAndOptimizeArticleImage(file: File): Promise<string> {
  if (!file || file.size === 0) throw new Error('Choisissez un fichier image non vide.');
  if (file.size > 8 * 1024 * 1024) throw new Error('La photo ne doit pas dépasser 8 Mo.');
  const bytes = new Uint8Array(await file.arrayBuffer());
  const mime = sniffRasterImageBytes(bytes);
  if (!mime) throw new Error('Format non pris en charge. Choisissez une photo JPG, PNG ou WebP.');
  const rawDataUrl = `data:${mime};base64,${bytesToBase64(bytes)}`;
  if (bytes.length <= 280 * 1024 || typeof document === 'undefined' || typeof Image === 'undefined') {
    return rawDataUrl;
  }
  return new Promise<string>(resolve => {
    const img = new Image();
    img.onload = () => {
      try {
        const maxDim = 1280;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          const ratio = Math.min(maxDim / width, maxDim / height);
          width = Math.max(1, Math.round(width * ratio));
          height = Math.max(1, Math.round(height * ratio));
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(rawDataUrl); return; }
        ctx.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL('image/jpeg', 0.84);
        resolve(isSafeArticleImageUrl(compressed) && compressed.length < rawDataUrl.length ? compressed : rawDataUrl);
      } catch {
        resolve(rawDataUrl);
      }
    };
    img.onerror = () => resolve(rawDataUrl);
    img.src = rawDataUrl;
  });
}

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
    if (block.type === 'image') {
      const figureStyle = block.align ? ` style="text-align: ${block.align};"` : '';
      return `<figure${figureStyle}><img src="${escapeArticleText(block.src)}" alt="${escapeArticleText(block.alt)}" loading="lazy"></figure>`;
    }
    if (block.type === 'list') { const tag = block.ordered ? 'ol' : 'ul'; return `<${tag}>${block.items.map(item => `<li>${inline(item)}</li>`).join('')}</${tag}>`; }
    const tag = block.type === 'heading' ? `h${block.level}` : block.type === 'quote' ? 'blockquote' : 'p';
    const alignAttr = block.align ? ` style="text-align: ${block.align};"` : '';
    return `<${tag}${alignAttr}>${inline(block.content)}</${tag}>`;
  }).join('');
}

/** Browser DOM -> bounded, typed document. Pasted attributes and unsupported elements cannot reach publication. */
export function articleDocumentFromElement(root: HTMLElement): ArticleDocument {
  const blocked = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'SVG', 'MATH', 'TEMPLATE']);
  const safeUrl = (value: string | null) => { try { const url = new URL(value || ''); return url.protocol === 'https:' ? url.href : undefined; } catch { return undefined; } };
  const safeImageUrl = (value: string | null) => {
    if (!value || !isSafeArticleImageUrl(value)) return undefined;
    return value.startsWith('data:image/') ? value : safeUrl(value);
  };
  const getAlign = (el: HTMLElement): 'left' | 'center' | 'right' | 'justify' | undefined => {
    const raw = (el.style?.textAlign || el.getAttribute('align') || (el.tagName === 'CENTER' ? 'center' : '')).toLowerCase().trim();
    if (raw === 'center') return 'center';
    if (raw === 'right') return 'right';
    if (raw === 'justify') return 'justify';
    if (raw === 'left') return 'left';
    return undefined;
  };
  const runs = (node: Node, marks: Omit<ArticleInline, 'text'> = {}): ArticleInline[] => {
    if (node.nodeType === Node.TEXT_NODE) return [{ text: node.textContent || '', ...marks }];
    if (!(node instanceof HTMLElement) || blocked.has(node.tagName)) return [];
    if (node.tagName === 'BR') return [{ text: '\n', ...marks }];
    const next = { ...marks };
    const fw = String(node.style?.fontWeight || '').trim().toLowerCase();
    const isBold = ['B', 'STRONG'].includes(node.tagName) || fw === 'bold' || fw === 'bolder' || (!isNaN(Number(fw)) && Number(fw) >= 600);
    if (isBold) next.bold = true;
    else if (fw === 'normal' || fw === '400') delete next.bold;

    const fs = String(node.style?.fontStyle || '').trim().toLowerCase();
    const isItalic = ['I', 'EM'].includes(node.tagName) || fs === 'italic' || fs === 'oblique';
    if (isItalic) next.italic = true;
    else if (fs === 'normal') delete next.italic;

    const td = String(node.style?.textDecoration || node.style?.textDecorationLine || '').trim().toLowerCase();
    const isUnderline = ['U', 'INS'].includes(node.tagName) || td.includes('underline');
    if (isUnderline) next.underline = true;
    else if (td.includes('none')) delete next.underline;

    if (node.tagName === 'A') next.href = safeUrl(node.getAttribute('href'));
    const raw = Array.from(node.childNodes).flatMap(child => runs(child, next));
    const merged: ArticleInline[] = [];
    for (const r of raw) {
      if (!r.text) continue;
      const last = merged[merged.length - 1];
      if (
        last &&
        Boolean(last.bold) === Boolean(r.bold) &&
        Boolean(last.italic) === Boolean(r.italic) &&
        Boolean(last.underline) === Boolean(r.underline) &&
        last.href === r.href
      ) {
        last.text += r.text;
      } else {
        merged.push({ ...r });
      }
    }
    return merged;
  };
  const blocks: ArticleDocument['blocks'] = [];
  const blockTags = new Set(['P', 'DIV', 'H2', 'H3', 'UL', 'OL', 'BLOCKQUOTE', 'FIGURE', 'IMG', 'CENTER']);
  const visitChildren = (parent: HTMLElement) => {
    let pending: ArticleInline[] = [];
    const parentAlign = getAlign(parent);
    const flush = () => {
      if (pending.some(run => run.text.trim())) {
        blocks.push({ type: 'paragraph', content: pending, ...(parentAlign ? { align: parentAlign } : {}) });
      }
      pending = [];
    };
    parent.childNodes.forEach(child => {
      if (child instanceof HTMLElement && blockTags.has(child.tagName)) {
        flush();
        visit(child);
      } else {
        pending.push(...runs(child));
      }
    });
    flush();
  };
  const visit = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      if (node.textContent) blocks.push({ type: 'paragraph', content: runs(node) });
      return;
    }
    if (!(node instanceof HTMLElement) || blocked.has(node.tagName)) return;
    const tag = node.tagName;
    const align = getAlign(node);
    if (tag === 'IMG') {
      const src = safeImageUrl(node.getAttribute('src'));
      const alt = node.getAttribute('alt')?.trim();
      if (src && alt) blocks.push({ type: 'image', src, alt, ...(align ? { align } : {}) });
      return;
    }
    if (tag === 'FIGURE') {
      const img = node.querySelector('img');
      const src = safeImageUrl(img?.getAttribute('src') || null);
      const alt = img?.getAttribute('alt')?.trim();
      if (src && alt) {
        blocks.push({ type: 'image', src, alt, ...(align ? { align } : {}) });
        return;
      }
    }
    if (['UL', 'OL'].includes(tag)) {
      blocks.push({
        type: 'list',
        ordered: tag === 'OL',
        items: Array.from(node.children).filter(item => item.tagName === 'LI').map(item => runs(item)),
      });
      return;
    }
    if (tag === 'H2' || tag === 'H3') {
      blocks.push({ type: 'heading', level: tag === 'H2' ? 2 : 3, content: runs(node), ...(align ? { align } : {}) });
      return;
    }
    if (tag === 'BLOCKQUOTE') {
      blocks.push({ type: 'quote', content: runs(node), ...(align ? { align } : {}) });
      return;
    }
    if (Array.from(node.children).some(child => blockTags.has(child.tagName))) {
      visitChildren(node);
      return;
    }
    blocks.push({ type: 'paragraph', content: runs(node), ...(align ? { align } : {}) });
  };
  visitChildren(root);
  return articleDocumentSchema.parse({ blocks });
}

export function extractArticleImages(value: string): Array<{ blockIndex: number; src: string; alt: string }> {
  const doc = parseArticleDocument(value);
  if (!doc) return [];
  const images: Array<{ blockIndex: number; src: string; alt: string }> = [];
  doc.blocks.forEach((block, index) => {
    if (block.type === 'image') {
      images.push({ blockIndex: index, src: block.src, alt: block.alt });
    }
  });
  return images;
}

export function removeArticleImageAt(value: string, blockIndex: number): string {
  const doc = parseArticleDocument(value);
  if (!doc) return value;
  const nextBlocks = doc.blocks.filter((_, idx) => idx !== blockIndex);
  if (nextBlocks.length === 0) {
    return '';
  }
  return ARTICLE_DOCUMENT_PREFIX + JSON.stringify({ blocks: nextBlocks });
}

export function updateArticleImageAltAt(value: string, blockIndex: number, nextAlt: string): string {
  const doc = parseArticleDocument(value);
  if (!doc) return value;
  const trimmed = nextAlt.trim().slice(0, 500) || 'Photo de l’article';
  const nextBlocks = doc.blocks.map((block, idx) =>
    idx === blockIndex && block.type === 'image' ? { ...block, alt: trimmed } : block
  );
  return ARTICLE_DOCUMENT_PREFIX + JSON.stringify({ blocks: nextBlocks });
}

export function appendArticleImages(value: string, images: Array<{ src: string; alt: string }>): string {
  const valid = images
    .map(item => ({ src: item.src, alt: (item.alt || 'Photo de l’article').trim().slice(0, 500) || 'Photo de l’article' }))
    .filter(item => isSafeArticleImageUrl(item.src));
  if (valid.length === 0) return value;
  const existing = parseArticleDocument(value);
  const baseBlocks: ArticleDocument['blocks'] = existing
    ? [...existing.blocks]
    : value.trim() && !value.startsWith(ARTICLE_DOCUMENT_PREFIX)
      ? value.split(/\n\s*\n/).filter(Boolean).map(p => ({ type: 'paragraph' as const, content: [{ text: p }] }))
      : [];
  for (const img of valid) {
    baseBlocks.push({ type: 'image', src: img.src, alt: img.alt });
  }
  return ARTICLE_DOCUMENT_PREFIX + JSON.stringify({ blocks: baseBlocks.slice(0, 1000) });
}
