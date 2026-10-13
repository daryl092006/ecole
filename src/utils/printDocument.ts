export function escapeHtml(value: unknown) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]!));
}
export function printDocument(title: string, markup: string) {
  const frame = document.createElement('iframe'); frame.title = title; frame.className = 'print-frame';
  frame.style.position = 'fixed'; frame.style.width = '1px'; frame.style.height = '1px'; frame.style.opacity = '0'; frame.style.pointerEvents = 'none';
  document.body.appendChild(frame);
  const documentToPrint = frame.contentDocument;
  if (!documentToPrint) { frame.remove(); throw new Error('Impression indisponible dans ce navigateur.'); }
  const logo = `<img class="document-logo" src="${escapeHtml(new URL('/logo-escen.png', window.location.origin).href)}" alt="ESCEN">`;
  const brandedMarkup = markup.includes('class="id-card"') ? markup.replace('<div class="id-card">', '<div class="id-card">' + logo) : logo + markup;
  documentToPrint.open(); documentToPrint.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>.document-logo{display:block;width:280px;max-width:100%;height:auto;margin-bottom:24px}.id-card .document-logo{width:260px;margin-bottom:14px}body{font:14px Arial,sans-serif;color:#152536;max-width:850px;margin:32px auto;padding:0 24px}h1{font-size:25px}h2{font-size:19px}.meta{color:#536170}.document-heading{border-bottom:2px solid #152536;padding-bottom:20px;margin-bottom:24px}.document-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.id-card{border:1px solid #152536;border-radius:10px;width:340px;padding:24px}.id-card h1{font-size:20px}.document-footer{margin-top:40px;border-top:1px solid #c4ced8;padding-top:16px;font-size:12px}table{width:100%;border-collapse:collapse;margin:20px 0}td,th{text-align:left;border-bottom:1px solid #c4ced8;padding:10px}th{background:#edf2f6}p{line-height:1.6}.signature{margin-top:60px;text-align:right}@page{margin:18mm}</style></head><body>${brandedMarkup}</body></html>`); documentToPrint.close();
  const cleanup = () => frame.remove();
  frame.contentWindow?.addEventListener('afterprint', cleanup, { once: true });
  const imagesReady = Promise.all(Array.from(documentToPrint.images).map(item => item.complete ? Promise.resolve() : new Promise<void>(resolve => { item.onload = () => resolve(); item.onerror = () => resolve(); })));
  void Promise.race([imagesReady, new Promise(resolve => setTimeout(resolve, 5000))]).then(() => { if (frame.isConnected) { frame.contentWindow?.focus(); frame.contentWindow?.print(); } });
  setTimeout(cleanup, 120000);
}
