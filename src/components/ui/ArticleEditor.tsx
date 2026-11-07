'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Bold, Italic, Underline, List, ListOrdered, Quote, Link2, ImageIcon, Undo2, Redo2, RemoveFormatting } from 'lucide-react';
import { ARTICLE_DOCUMENT_PREFIX, articleDocumentFromElement, articlePlainText, escapeArticleText, renderArticleContent } from '@/utils/articleDocument';

export default function ArticleEditor({ value, onChange, onValidityChange, disabled = false }: { value: string; onChange: (value: string) => void; onValidityChange?: (error: string) => void; disabled?: boolean }) {
  const id = useId();
  const editor = useRef<HTMLDivElement>(null);
  const lastValue = useRef(value);
  const selection = useRef<Range | null>(null);
  const [insert, setInsert] = useState<'link' | 'image' | null>(null);
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(false);
  const [active, setActive] = useState<Record<string, boolean>>({});
  useEffect(() => {
    if (editor.current && (lastValue.current !== value || !editor.current.dataset.initialized)) {
      editor.current.innerHTML = renderArticleContent(value) || '<p><br></p>';
      editor.current.dataset.initialized = 'true';
      lastValue.current = value;
    }
  }, [value]);
  const capture = () => {
    const current = window.getSelection();
    if (current?.rangeCount && editor.current?.contains(current.anchorNode)) selection.current = current.getRangeAt(0).cloneRange();
    setActive(Object.fromEntries(['bold', 'italic', 'underline', 'insertUnorderedList', 'insertOrderedList'].map(command => [command, document.queryCommandState(command)])));
  };
  const sync = () => {
    if (!editor.current) return;
    try {
      const next = ARTICLE_DOCUMENT_PREFIX + JSON.stringify(articleDocumentFromElement(editor.current));
      lastValue.current = next;
      onChange(next);
      const issue = next.length > 50000 ? 'L’article dépasse la limite de 50 000 caractères. Raccourcissez le contenu.' : '';
      setError(issue); onValidityChange?.(issue);
    } catch { const issue = 'Le contenu est trop complexe. Réduisez la taille du texte ou le nombre de blocs.'; setError(issue); onValidityChange?.(issue); }
    capture();
  };
  const command = (name: string, argument?: string) => {
    editor.current?.focus();
    if (selection.current && editor.current?.contains(selection.current.commonAncestorContainer)) {
      const current = window.getSelection(); current?.removeAllRanges(); current?.addRange(selection.current);
    }
    document.execCommand(name, false, argument);
    sync();
  };
  const buttons = [
    ['bold', 'Gras', Bold], ['italic', 'Italique', Italic], ['underline', 'Souligné', Underline],
    ['insertUnorderedList', 'Liste à puces', List], ['insertOrderedList', 'Liste numérotée', ListOrdered],
    ['undo', 'Annuler la dernière modification', Undo2], ['redo', 'Rétablir la modification', Redo2],
    ['removeFormat', 'Effacer la mise en forme', RemoveFormatting],
  ] as const;
  const words = articlePlainText(value).trim().split(/\s+/).filter(Boolean).length;
  return <div className="article-editor">
    <div className="article-editor-header"><span id={`${id}-label`}>Contenu de l’article</span><button type="button" className="btn btn-outline btn-sm" onClick={() => setPreview(!preview)}>{preview ? 'Reprendre la rédaction' : 'Aperçu de l’article'}</button></div>
    <div hidden={preview}>
      <div role="toolbar" aria-label="Mise en forme de l’article" className="article-editor-toolbar">
        <select className="select-input" aria-label="Style du paragraphe" disabled={disabled} defaultValue="p" onChange={event => command('formatBlock', event.target.value)}><option value="p">Paragraphe</option><option value="h2">Titre de section</option><option value="h3">Sous-titre</option></select>
        {buttons.map(([name, label, Icon]) => <button type="button" key={name} title={label} aria-label={label} aria-pressed={active[name] || false} disabled={disabled} onMouseDown={event => event.preventDefault()} onClick={() => command(name)}><Icon size={18} aria-hidden="true" /></button>)}
        <button type="button" aria-label="Citation" title="Citation" disabled={disabled} onMouseDown={event => event.preventDefault()} onClick={() => command('formatBlock', 'blockquote')}><Quote size={18} aria-hidden="true" /></button>
        {([['link', 'Insérer un lien', Link2], ['image', 'Insérer une image', ImageIcon]] as const).map(([kind, label, Icon]) => <button type="button" key={kind} title={label} aria-label={label} disabled={disabled} onMouseDown={event => event.preventDefault()} onClick={() => { capture(); setInsert(kind); setUrl(''); setDescription(kind === 'link' ? window.getSelection()?.toString() || '' : ''); }}><Icon size={18} aria-hidden="true" /></button>)}
        <button type="button" className="btn btn-outline btn-sm" disabled={disabled} onMouseDown={event => event.preventDefault()} onClick={() => command('unlink')}>Retirer le lien</button>
      </div>
      {insert && <div className="article-editor-insert">
        <label className="form-group">Adresse HTTPS<input className="input" type="url" value={url} onChange={event => setUrl(event.target.value)} /></label>
        <label className="form-group">{insert === 'image' ? 'Description de l’image' : 'Texte du lien'}<input className="input" maxLength={500} value={description} onChange={event => setDescription(event.target.value)} /></label>
        <div className="btn-group"><button type="button" className="btn btn-primary" disabled={disabled} onClick={() => {
          let safe: URL; try { safe = new URL(url); if (safe.protocol !== 'https:') throw new Error(); } catch { setError('Saisissez une adresse HTTPS complète.'); return; }
          if (!description.trim()) { setError(insert === 'image' ? 'Décrivez l’image pour les lecteurs.' : 'Indiquez le texte du lien.'); return; }
          command('insertHTML', insert === 'image' ? `<figure><img src="${escapeArticleText(safe.href)}" alt="${escapeArticleText(description)}"></figure><p><br></p>` : `<a href="${escapeArticleText(safe.href)}" target="_blank" rel="noopener noreferrer">${escapeArticleText(description)}</a>`);
          setInsert(null);
        }}>Insérer</button><button type="button" className="btn btn-outline" onClick={() => setInsert(null)}>Annuler</button></div>
      </div>}
      <div ref={editor} role="textbox" aria-multiline="true" aria-labelledby={`${id}-label`} aria-describedby={`${id}-help`} aria-disabled={disabled} contentEditable={!disabled} suppressContentEditableWarning className="article-editor-canvas article-content" onInput={sync} onKeyUp={capture} onMouseUp={capture} onPaste={event => { event.preventDefault(); command('insertText', event.clipboardData.getData('text/plain')); }} onDrop={event => event.preventDefault()} />
    </div>
    {preview && <div className="article-content article-editor-preview" dangerouslySetInnerHTML={{ __html: renderArticleContent(value) }} />}
    <p id={`${id}-help`} className="cell-sub">{words} mots · {Math.max(1, Math.ceil(words / 200))} min de lecture · Sélectionnez du texte pour le mettre en forme.</p>
    {error && <p role="alert" className="auth-error">{error}</p>}
  </div>;
}
