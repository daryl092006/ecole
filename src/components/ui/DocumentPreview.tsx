'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import WorkPage from './WorkPage';
import LoadingState from './LoadingState';

interface Props {
  filename: string;
  mimeType: string;
  load: (signal: AbortSignal) => Promise<Blob>;
  download: () => Promise<void>;
  onClose: () => void;
}

/** Private files are fetched with existing authorization, then viewed locally. */
export default function DocumentPreview({ filename, mimeType, load, download, onClose }: Props) {
  const [source, setSource] = useState<{ url: string; type: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [downloading, setDownloading] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    let url: string | undefined;
    setLoading(true); setError(''); setSource(null);
    void load(controller.signal).then(blob => {
      if (controller.signal.aborted) return;
      const type = (blob.type || mimeType).split(';')[0].toLowerCase();
      if (!['application/pdf', 'image/jpeg', 'image/png'].includes(type)) throw new Error('L’aperçu de ce format est indisponible. Vous pouvez télécharger le document.');
      url = URL.createObjectURL(new Blob([blob], { type }));
      setSource({ url, type });
    }).catch(cause => {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Aperçu indisponible. Réessayez.');
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => { controller.abort(); if (url) URL.revokeObjectURL(url); };
  }, [load, mimeType, retry]);

  async function saveFile() {
    setDownloading(true); setError('');
    try { await download(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Téléchargement impossible.'); }
    finally { setDownloading(false); }
  }

  return <WorkPage title={`Aperçu · ${filename}`} onClose={onClose}>
    <div className="private-document-preview">
      <div className="btn-group"><button type="button" className="btn btn-outline" disabled={downloading} onClick={() => { void saveFile(); }}>{downloading ? 'Téléchargement…' : 'Télécharger'}</button></div>
      {loading && <LoadingState label="Chargement de l’aperçu…" />}
      {error && <div role="alert" className="restricted-box"><p>{error}</p><button type="button" className="btn btn-outline" onClick={() => setRetry(value => value + 1)}>Réessayer l’aperçu</button></div>}
      {source && (source.type === 'application/pdf'
        ? <iframe className="private-document-preview-frame" title={`Document PDF : ${filename}`} src={source.url} referrerPolicy="no-referrer" />
        : <Image className="private-document-preview-image" src={source.url} alt={`Document : ${filename}`} width={1200} height={1600} unoptimized />)}
    </div>
  </WorkPage>;
}
