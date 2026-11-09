'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Bold, Italic, Underline, List, ListOrdered, Quote, Link2, ImageIcon, Undo2, Redo2, RemoveFormatting, Upload, Trash2, Sparkles } from 'lucide-react';
import {
  ARTICLE_DOCUMENT_PREFIX,
  appendArticleImages,
  articleDocumentFromElement,
  articlePlainText,
  escapeArticleText,
  extractArticleImages,
  isSafeArticleImageUrl,
  readAndOptimizeArticleImage,
  removeArticleImageAt,
  renderArticleContent,
  updateArticleImageAltAt,
} from '@/utils/articleDocument';

function suggestAltFromFilename(filename: string): string {
  const base = filename.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim();
  if (!base) return 'Photo de l’article';
  return base.charAt(0).toUpperCase() + base.slice(1);
}

export default function ArticleEditor({
  value,
  onChange,
  onValidityChange,
  onSelectCover,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  onValidityChange?: (error: string) => void;
  onSelectCover?: (src: string) => void;
  disabled?: boolean;
}) {
  const id = useId();
  const editor = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const multiPhotoInputRef = useRef<HTMLInputElement>(null);
  const lastValue = useRef(value);
  const selection = useRef<Range | null>(null);
  const [insert, setInsert] = useState<'link' | 'image' | null>(null);
  const [url, setUrl] = useState('');
  const [uploadedImage, setUploadedImage] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
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

  useEffect(() => {
    const handleSelectionChange = () => {
      const current = window.getSelection();
      if (current?.rangeCount && editor.current?.contains(current.anchorNode)) {
        selection.current = current.getRangeAt(0).cloneRange();
        setActive(
          Object.fromEntries(
            ['bold', 'italic', 'underline', 'insertUnorderedList', 'insertOrderedList'].map(cmd => [
              cmd,
              document.queryCommandState(cmd),
            ])
          )
        );
      }
    };
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, []);

  const inlineImages = useMemo(() => extractArticleImages(value), [value]);

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
      const plainLen = articlePlainText(next).length;
      const issue = plainLen > 50000 || next.length > 3_000_000 ? 'L’article dépasse la limite de 50 000 caractères. Raccourcissez le contenu.' : '';
      setError(issue); onValidityChange?.(issue);
    } catch { const issue = 'Le contenu est trop complexe. Réduisez la taille du texte ou le nombre de blocs.'; setError(issue); onValidityChange?.(issue); }
    capture();
  };

  const command = (name: string, argument?: string) => {
    editor.current?.focus();
    const current = window.getSelection();
    const hasActiveSelectionInEditor =
      Boolean(current && current.rangeCount > 0 && editor.current?.contains(current.anchorNode));
    if (!hasActiveSelectionInEditor && selection.current && editor.current?.contains(selection.current.commonAncestorContainer)) {
      current?.removeAllRanges();
      current?.addRange(selection.current);
    }
    document.execCommand(name, false, argument);
    sync();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const isMeta = event.metaKey || event.ctrlKey;
    if (isMeta && !event.shiftKey && !event.altKey) {
      const key = event.key.toLowerCase();
      if (key === 'b') {
        event.preventDefault();
        command('bold');
        return;
      }
      if (key === 'i') {
        event.preventDefault();
        command('italic');
        return;
      }
      if (key === 'u') {
        event.preventDefault();
        command('underline');
        return;
      }
      if (key === 'z') {
        event.preventDefault();
        command('undo');
        return;
      }
      if (key === 'y') {
        event.preventDefault();
        command('redo');
        return;
      }
    }
  };

  const handlePhotoFile = async (file: File | undefined) => {
    if (!file) return;
    setUploadingImage(true);
    setError('');
    try {
      const dataUrl = await readAndOptimizeArticleImage(file);
      setInsert('image');
      setUploadedImage(dataUrl);
      setUploadedFileName(file.name);
      setUrl('');
      setDescription(prev => prev.trim() || suggestAltFromFilename(file.name));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de charger cette photo.');
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDirectMultiplePhotos = async (fileList: FileList | File[] | null | undefined) => {
    const files = Array.from(fileList || []).filter(f => f.type.startsWith('image/'));
    if (files.length === 0) return;
    setUploadingImage(true);
    setError('');
    try {
      const prepared: Array<{ src: string; alt: string }> = [];
      for (const file of files) {
        const dataUrl = await readAndOptimizeArticleImage(file);
        prepared.push({ src: dataUrl, alt: suggestAltFromFilename(file.name) });
      }
      const currentValue = editor.current
        ? ARTICLE_DOCUMENT_PREFIX + JSON.stringify(articleDocumentFromElement(editor.current))
        : value;
      const next = appendArticleImages(currentValue, prepared);
      lastValue.current = '';
      onChange(next);
      if (onSelectCover && prepared[0]) {
        onSelectCover(prepared[0].src);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible d’importer les photos sélectionnées.');
    } finally {
      setUploadingImage(false);
      if (multiPhotoInputRef.current) multiPhotoInputRef.current.value = '';
    }
  };

  const removeInlineImage = (blockIndex: number) => {
    const next = removeArticleImageAt(value, blockIndex);
    lastValue.current = '';
    onChange(next);
  };

  const updateInlineImageAlt = (blockIndex: number, nextAlt: string) => {
    const next = updateArticleImageAltAt(value, blockIndex, nextAlt);
    lastValue.current = '';
    onChange(next);
  };

  const buttons = [
    ['bold', 'Gras', Bold], ['italic', 'Italique', Italic], ['underline', 'Souligné', Underline],
    ['insertUnorderedList', 'Liste à puces', List], ['insertOrderedList', 'Liste numérotée', ListOrdered],
    ['undo', 'Annuler la dernière modification', Undo2], ['redo', 'Rétablir la modification', Redo2],
    ['removeFormat', 'Effacer la mise en forme', RemoveFormatting],
  ] as const;
  const words = articlePlainText(value).trim().split(/\s+/).filter(Boolean).length;

  return <div className="article-editor">
    <div className="article-editor-header">
      <span id={`${id}-label`}>Contenu de l’article</span>
      <div className="article-editor-header-actions">
        <button
          type="button"
          className="btn btn-outline btn-sm"
          disabled={disabled || uploadingImage}
          onClick={() => {
            capture();
            setError('');
            multiPhotoInputRef.current?.click();
          }}
        >
          <Upload size={15} aria-hidden="true" />{uploadingImage ? 'Importation…' : 'Ajouter des photos au contenu'}
        </button>
        <button type="button" className="btn btn-outline btn-sm" onClick={() => setPreview(!preview)}>{preview ? 'Reprendre la rédaction' : 'Aperçu de l’article'}</button>
      </div>
    </div>
    <input
      ref={fileInputRef}
      type="file"
      accept="image/jpeg,image/png,image/webp"
      hidden
      onChange={event => void handlePhotoFile(event.target.files?.[0])}
    />
    <input
      ref={multiPhotoInputRef}
      type="file"
      accept="image/jpeg,image/png,image/webp"
      multiple
      hidden
      onChange={event => void handleDirectMultiplePhotos(event.target.files)}
    />
    <div hidden={preview}>
      <div className="article-editor-sticky-wrapper">
        <div role="toolbar" aria-label="Mise en forme de l’article" className="article-editor-toolbar">
          <select className="select-input" aria-label="Style du paragraphe" disabled={disabled} defaultValue="p" onChange={event => command('formatBlock', event.target.value)}><option value="p">Paragraphe</option><option value="h2">Titre de section</option><option value="h3">Sous-titre</option></select>
          {buttons.map(([name, label, Icon]) => <button type="button" key={name} title={label} aria-label={label} aria-pressed={active[name] || false} disabled={disabled} onMouseDown={event => event.preventDefault()} onClick={() => command(name)}><Icon size={18} aria-hidden="true" /></button>)}
          <button type="button" aria-label="Citation" title="Citation" disabled={disabled} onMouseDown={event => event.preventDefault()} onClick={() => command('formatBlock', 'blockquote')}><Quote size={18} aria-hidden="true" /></button>
          {([['link', 'Insérer un lien', Link2], ['image', 'Insérer une image', ImageIcon]] as const).map(([kind, label, Icon]) => <button type="button" key={kind} title={label} aria-label={label} disabled={disabled} onMouseDown={event => event.preventDefault()} onClick={() => { capture(); setError(''); setInsert(kind); setUrl(''); setUploadedImage(''); setUploadedFileName(''); setDescription(kind === 'link' ? window.getSelection()?.toString() || '' : ''); }}><Icon size={18} aria-hidden="true" /></button>)}
          <button type="button" className="btn btn-outline btn-sm" disabled={disabled} onMouseDown={event => event.preventDefault()} onClick={() => command('unlink')}>Retirer le lien</button>
          <div className="article-editor-toolbar-spacer" />
          <button
            type="button"
            className="btn btn-primary btn-sm article-toolbar-add-photo-btn"
            disabled={disabled || uploadingImage}
            title="Ajouter une ou plusieurs photos à l’article"
            onClick={() => {
              capture();
              setError('');
              multiPhotoInputRef.current?.click();
            }}
          >
            <Upload size={14} aria-hidden="true" />
            <span>{uploadingImage ? 'Importation…' : '+ Photo'}</span>
          </button>
        </div>
        {insert && <div className="article-editor-insert">
          {insert === 'image' && (
            <div className="article-photo-upload-box">
              <div className="article-photo-upload-actions">
                <button type="button" className="btn btn-outline btn-sm" disabled={disabled || uploadingImage} onClick={() => fileInputRef.current?.click()}>
                  <Upload size={15} aria-hidden="true" />{uploadingImage ? 'Chargement de la photo…' : 'Importer une photo depuis l’appareil (JPG, PNG, WebP)'}
                </button>
                {uploadedImage && (
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => { setUploadedImage(''); setUploadedFileName(''); }}>
                    Retirer la photo choisie
                  </button>
                )}
              </div>
              {uploadedImage && (
                <div className="article-photo-upload-preview">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={uploadedImage} alt={description || 'Aperçu de la photo'} />
                  <span>{uploadedFileName || 'Photo prête à être insérée'}</span>
                </div>
              )}
            </div>
          )}
          <label className="form-group">Adresse HTTPS<input className="input" type="url" placeholder={insert === 'image' ? 'https://... (ou importez une photo ci-dessus)' : 'https://...'} value={url} onChange={event => { setUrl(event.target.value); if (event.target.value) { setUploadedImage(''); setUploadedFileName(''); } }} /></label>
          <label className="form-group">{insert === 'image' ? 'Description de l’image' : 'Texte du lien'}<input className="input" maxLength={500} placeholder={insert === 'image' ? 'Ex : Étudiants lors de l’atelier entrepreneuriat' : 'Ex : Consulter le programme'} value={description} onChange={event => setDescription(event.target.value)} /></label>
          <div className="btn-group"><button type="button" className="btn btn-primary" disabled={disabled || uploadingImage} onClick={() => {
            if (insert === 'image') {
              const candidateSrc = uploadedImage || url.trim();
              if (!isSafeArticleImageUrl(candidateSrc)) {
                setError('Saisissez une adresse HTTPS complète ou importez une photo valide.');
                return;
              }
              if (!description.trim()) {
                setError('Décrivez l’image pour les lecteurs.');
                return;
              }
              const normalizedSrc = candidateSrc.startsWith('data:image/') ? candidateSrc : new URL(candidateSrc).href;
              command('insertHTML', `<figure><img src="${escapeArticleText(normalizedSrc)}" alt="${escapeArticleText(description.trim())}"></figure><p><br></p>`);
              setInsert(null);
              setUploadedImage('');
              setUploadedFileName('');
              setError('');
              return;
            }
            let safe: URL; try { safe = new URL(url); if (safe.protocol !== 'https:') throw new Error(); } catch { setError('Saisissez une adresse HTTPS complète.'); return; }
            if (!description.trim()) { setError('Indiquez le texte du lien.'); return; }
            command('insertHTML', `<a href="${escapeArticleText(safe.href)}" target="_blank" rel="noopener noreferrer">${escapeArticleText(description)}</a>`);
            setInsert(null);
            setError('');
          }}>Insérer</button><button type="button" className="btn btn-outline" onClick={() => { setInsert(null); setUploadedImage(''); setUploadedFileName(''); }}>Annuler</button></div>
        </div>}
      </div>
      <div
        ref={editor}
        role="textbox"
        aria-multiline="true"
        aria-labelledby={`${id}-label`}
        aria-describedby={`${id}-help`}
        aria-disabled={disabled}
        contentEditable={!disabled}
        suppressContentEditableWarning
        className="article-editor-canvas article-content"
        onInput={sync}
        onKeyDown={handleKeyDown}
        onSelect={capture}
        onKeyUp={capture}
        onMouseUp={capture}
        onPaste={event => {
          const files = Array.from(event.clipboardData?.files || []).filter(f => f.type.startsWith('image/'));
          if (files.length > 0) {
            event.preventDefault();
            void handleDirectMultiplePhotos(files);
            return;
          }
          event.preventDefault();
          command('insertText', event.clipboardData.getData('text/plain'));
        }}
        onDragOver={event => event.preventDefault()}
        onDrop={event => {
          event.preventDefault();
          const files = Array.from(event.dataTransfer?.files || []).filter(f => f.type.startsWith('image/'));
          if (files.length > 0) {
            void handleDirectMultiplePhotos(files);
          }
        }}
      />
      <div className="article-editor-bottom-bar" aria-label="Actions rapides d’insertion de photos">
        <button
          type="button"
          className="btn btn-outline btn-sm article-bottom-add-btn"
          disabled={disabled || uploadingImage}
          onClick={() => {
            editor.current?.focus();
            capture();
            setError('');
            multiPhotoInputRef.current?.click();
          }}
        >
          <Upload size={14} aria-hidden="true" />
          <span>+ Ajouter des photos ici</span>
        </button>
        <button
          type="button"
          className="btn btn-outline btn-sm"
          disabled={disabled || uploadingImage}
          onClick={() => {
            capture();
            setError('');
            setInsert('image');
            setUrl('');
            setUploadedImage('');
            setUploadedFileName('');
            setDescription('');
          }}
        >
          <ImageIcon size={14} aria-hidden="true" />
          <span>Image par URL / Fichier</span>
        </button>
        <span className="article-bottom-bar-hint">
          Glissez-déposez ou collez (Cmd+V / Ctrl+V) directement vos photos dans l’article.
        </span>
      </div>
      {inlineImages.length > 0 && (
        <div className="article-inline-images-strip" aria-label="Photos intégrées dans l’article">
          <span className="article-inline-images-title">Photos intégrées dans le contenu ({inlineImages.length})</span>
          <div className="article-inline-images-list">
            {inlineImages.map((img, idx) => (
              <div className="article-inline-image-chip" key={`${img.blockIndex}-${idx}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.src} alt={img.alt} />
                <input
                  className="input article-inline-caption-input"
                  aria-label={`Légende de la photo ${idx + 1}`}
                  value={img.alt}
                  disabled={disabled}
                  placeholder="Légende de la photo…"
                  onChange={event => updateInlineImageAlt(img.blockIndex, event.target.value)}
                />
                {onSelectCover && (
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    disabled={disabled}
                    title="Utiliser cette photo comme couverture de l’article"
                    onClick={() => onSelectCover(img.src)}
                  >
                    <Sparkles size={13} aria-hidden="true" />Couverture
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  disabled={disabled}
                  aria-label={`Retirer la photo : ${img.alt}`}
                  onClick={() => removeInlineImage(img.blockIndex)}
                >
                  <Trash2 size={14} aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
    {preview && <div className="article-content article-editor-preview" dangerouslySetInnerHTML={{ __html: renderArticleContent(value) }} />}
    <p id={`${id}-help`} className="cell-sub">{words} mots · {Math.max(1, Math.ceil(words / 200))} min de lecture · {inlineImages.length} {inlineImages.length > 1 ? 'photos intégrées' : 'photo intégrée'} · Sélectionnez du texte pour le mettre en forme ou importez des photos.</p>
    {error && <p role="alert" className="auth-error">{error}</p>}
  </div>;
}
