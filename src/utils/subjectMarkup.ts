const allowed = new Set(['p', 'div', 'span', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'ul', 'ol', 'li', 'blockquote', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'sub', 'sup', 'h2', 'h3', 'h4', 'pre', 'code', 'a', 'img', 'figure', 'figcaption', 'video']);
const removed = new Set(['script', 'style', 'iframe', 'object', 'embed', 'svg', 'math', 'form', 'input', 'button', 'textarea', 'select', 'template']);
export function safeSubjectUrl(value: string): string | null {
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) ? url.href : null; } catch { return null; }
}
export const escapeSubjectText = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!));

/** Browser-only HTML allow-list, shared by editing, preview and printing. */
export function sanitizeSubjectMarkup(value: string): string {
  if (!/<[a-z!/]/i.test(value)) return escapeSubjectText(value).replace(/\n/g, '<br>');
  const parsed = new DOMParser().parseFromString(value, 'text/html');
  const output = document.createElement('div');
  const copy = (node: Node, parent: Node) => {
    if (node.nodeType === Node.TEXT_NODE) { parent.appendChild(document.createTextNode(node.textContent || '')); return; }
    if (!(node instanceof Element)) return;
    const original = node.tagName.toLowerCase();
    if (removed.has(original)) return;
    const tag = original === 'font' ? 'span' : original;
    if (!allowed.has(tag)) { node.childNodes.forEach(child => copy(child, parent)); return; }
    const element = document.createElement(tag);
    if (tag === 'a' || tag === 'img' || tag === 'video') {
      const url = safeSubjectUrl(node.getAttribute(tag === 'a' ? 'href' : 'src') || '');
      if (!url) { if (tag === 'a') node.childNodes.forEach(child => copy(child, parent)); return; }
      element.setAttribute(tag === 'a' ? 'href' : 'src', url);
      if (tag === 'a') { element.setAttribute('target', '_blank'); element.setAttribute('rel', 'noopener noreferrer'); }
      if (tag === 'img') { element.setAttribute('alt', node.getAttribute('alt') || 'Illustration du sujet'); element.setAttribute('loading', 'lazy'); }
      if (tag === 'video') { element.setAttribute('controls', ''); element.setAttribute('preload', 'none'); }
    }
    if (node instanceof HTMLElement) {
      const align = node.style.textAlign;
      if (['left', 'center', 'right', 'justify'].includes(align)) element.style.textAlign = align;
      const color = node.style.color || node.getAttribute('color') || '';
      if (/^(#[0-9a-f]{3,8}|rgb\(\d{1,3},\s*\d{1,3},\s*\d{1,3}\))$/i.test(color)) element.style.color = color;
      const font = (node.style.fontFamily || node.getAttribute('face') || '').replace(/["']/g, '');
      if (['Arial', 'Georgia', 'Courier New', 'inherit'].includes(font)) element.style.fontFamily = font;
    }
    node.childNodes.forEach(child => copy(child, element));
    parent.appendChild(element);
  };
  parsed.body.childNodes.forEach(node => copy(node, output));
  return output.innerHTML;
}
