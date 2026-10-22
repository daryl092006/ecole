import { transcriptDocumentMarkup, type TranscriptDocument } from '@/services/transcriptDocumentService';
import { escapeHtml as h } from './printDocument';

export function transcriptPrintHtml(document: TranscriptDocument, stylesheets: string[], origin: string): string {
  return `<!doctype html><html lang="fr" class="transcript-print-root"><head><meta charset="utf-8"><base href="${h(origin)}"><title>Relevé ${h(document.reference)}</title>${stylesheets.map(href => `<link rel="stylesheet" href="${h(href)}">`).join('')}</head><body class="transcript-print-body">${transcriptDocumentMarkup(document)}</body></html>`;
}

/** Keep every row and the signature inside the measured A4 printable area. */
export function fitTranscriptToPage(document: Document): void {
  const sheet = document.querySelector<HTMLElement>('.transcript-sheet');
  const content = document.querySelector<HTMLElement>('.transcript-content');
  if (!sheet || !content || !sheet.clientHeight || !sheet.clientWidth) throw new Error('La mise en page du relevé n’a pas pu être chargée.');
  content.style.transform = '';
  const scale = Math.min(1, (sheet.clientHeight - 2) / content.scrollHeight, (sheet.clientWidth - 2) / content.scrollWidth);
  content.style.transform = `scale(${scale})`;
}

export async function printTranscript(documentContent: TranscriptDocument): Promise<void> {
  const frame = document.createElement('iframe');
  frame.className = 'print-frame transcript-print-frame';
  frame.title = `Relevé ${documentContent.reference}`;
  document.body.appendChild(frame);
  const cleanup = () => frame.remove();
  try {
    const target = frame.contentDocument;
    if (!target || !frame.contentWindow) throw new Error('Impression indisponible dans ce navigateur.');
    const sheets = [...document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')].map(link => link.href);
    target.open(); target.write(transcriptPrintHtml(documentContent, sheets, window.location.origin)); target.close();
    const waitForResource = (element: HTMLLinkElement | HTMLImageElement) => new Promise<void>((resolve, reject) => {
      if (element.tagName === 'LINK' ? !!(element as HTMLLinkElement).sheet : (element as HTMLImageElement).complete && (element as HTMLImageElement).naturalWidth > 0) return resolve();
      element.onload = () => resolve(); element.onerror = () => reject(new Error('Une ressource du relevé n’a pas pu être chargée. Réessayez l’impression.'));
    });
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        Promise.all([...target.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]'), ...target.images].map(waitForResource)).then(() => target.fonts.ready),
        new Promise<never>((_, reject) => { timeout = setTimeout(() => reject(new Error('Le chargement du relevé a expiré. Réessayez l’impression.')), 15000); }),
      ]);
    } finally { clearTimeout(timeout); }
    fitTranscriptToPage(target);
    frame.contentWindow.addEventListener('afterprint', cleanup, { once: true });
    frame.contentWindow.focus(); frame.contentWindow.print();
    setTimeout(cleanup, 120000);
  } catch (error) { cleanup(); throw error; }
}
