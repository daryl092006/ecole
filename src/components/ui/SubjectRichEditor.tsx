'use client';
import { useId, useRef, useState } from 'react';
import { Bold, Italic, Underline, Strikethrough, List, ListOrdered, Subscript, Superscript, Link2, Image, Table2, Video, RemoveFormatting, AlignLeft, AlignCenter, AlignRight, Eye, Code2 } from 'lucide-react';
import { escapeSubjectText, safeSubjectUrl } from '@/utils/subjectMarkup';
import SubjectRichText from '@/components/ui/SubjectRichText';

export default function SubjectRichEditor({ value, onChange, label, disabled = false, maxLength = 8000 }: {
  value: string; onChange: (value: string) => void; label: string; disabled?: boolean; maxLength?: number;
}) {
  const id = useId();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [insert, setInsert] = useState<'link' | 'image' | 'video' | null>(null);
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  const insertMarkup = (before: string, after: string = '') => {
    if (disabled) return;
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    const current = el.value;
    const selected = current.slice(start, end);
    const replacement = `${before}${selected || ''}${after}`;
    const next = current.slice(0, start) + replacement + current.slice(end);
    onChange(next);
    setTimeout(() => {
      el.focus();
      const newCursor = start + before.length + (selected ? selected.length : 0);
      el.setSelectionRange(newCursor, newCursor);
    }, 0);
  };

  const cleanFormat = () => {
    if (disabled) return;
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    const current = el.value;
    const selected = current.slice(start, end);
    if (!selected) return;
    const stripped = selected.replace(/<[^>]*>/g, '');
    const next = current.slice(0, start) + stripped + current.slice(end);
    onChange(next);
  };

  const handleTextChange = (text: string) => {
    onChange(text);
    if (text.length > maxLength) {
      setError(`Le contenu dépasse la limite de ${maxLength} caractères.`);
    } else {
      setError('');
    }
  };

  const actions = [
    ['bold', 'Gras', Bold, '<strong>', '</strong>'],
    ['italic', 'Italique', Italic, '<em>', '</em>'],
    ['underline', 'Souligné', Underline, '<u>', '</u>'],
    ['strikeThrough', 'Barré', Strikethrough, '<s>', '</s>'],
    ['subscript', 'Indice', Subscript, '<sub>', '</sub>'],
    ['superscript', 'Exposant', Superscript, '<sup>', '</sup>'],
    ['insertUnorderedList', 'Liste à puces', List, '<ul>\n  <li>', '</li>\n</ul>'],
    ['insertOrderedList', 'Liste numérotée', ListOrdered, '<ol>\n  <li>', '</li>\n</ol>'],
    ['justifyLeft', 'Aligner à gauche', AlignLeft, '<div style="text-align: left;">', '</div>'],
    ['justifyCenter', 'Centrer', AlignCenter, '<div style="text-align: center;">', '</div>'],
    ['justifyRight', 'Aligner à droite', AlignRight, '<div style="text-align: right;">', '</div>'],
  ] as const;

  return <div className="subject-rich-editor">
    <div className="subject-rich-header">
      <span id={`${id}-label`} className="subject-field-label">{label}</span>
      <button type="button" className="btn btn-outline btn-sm" onClick={() => setShowPreview(prev => !prev)} title="Basculer l'aperçu du rendu">
        {showPreview ? <><Code2 size={14} aria-hidden="true" /> Modifier</> : <><Eye size={14} aria-hidden="true" /> Aperçu</>}
      </button>
    </div>
    <div className="subject-rich-frame">
      <div className="subject-rich-toolbar" role="toolbar" aria-label={`Mise en forme : ${label}`}>
        <select aria-label={`Style de paragraphe : ${label}`} disabled={disabled} defaultValue="p" onChange={event => {
          const val = event.target.value;
          if (val === 'p') insertMarkup('<p>', '</p>');
          else if (val === 'h2') insertMarkup('<h2>', '</h2>');
          else if (val === 'h3') insertMarkup('<h3>', '</h3>');
          else if (val === 'blockquote') insertMarkup('<blockquote>', '</blockquote>');
        }}>
          <option value="p">Normal</option>
          <option value="h2">Titre</option>
          <option value="h3">Sous-titre</option>
          <option value="blockquote">Citation</option>
        </select>
        <select aria-label={`Police : ${label}`} disabled={disabled} defaultValue="Arial" onChange={event => insertMarkup(`<span style="font-family: ${event.target.value};">`, '</span>')}>
          <option value="Arial">Arial</option>
          <option value="Georgia">Georgia</option>
          <option value="Courier New">Courrier</option>
        </select>
        {actions.map(([name, text, Icon, before, after]) => (
          <button type="button" key={name} aria-label={text} title={text} disabled={disabled} onMouseDown={event => event.preventDefault()} onClick={() => insertMarkup(before, after)}>
            <Icon size={16} aria-hidden="true" />
          </button>
        ))}
        {([['link', 'Insérer un lien', Link2], ['image', 'Insérer une image', Image], ['video', 'Insérer une vidéo', Video]] as const).map(([kind, text, Icon]) => (
          <button type="button" key={kind} aria-label={text} title={text} disabled={disabled} onMouseDown={event => event.preventDefault()} onClick={() => { setInsert(kind); setUrl(''); setDescription(''); }}>
            <Icon size={16} aria-hidden="true" />
          </button>
        ))}
        <button type="button" aria-label="Insérer un tableau" title="Insérer un tableau" disabled={disabled} onMouseDown={event => event.preventDefault()} onClick={() => insertMarkup('<table>\n  <thead><tr><th>Colonne 1</th><th>Colonne 2</th></tr></thead>\n  <tbody><tr><td>Valeur 1</td><td>Valeur 2</td></tr></tbody>\n</table>\n')}>
          <Table2 size={16} aria-hidden="true" />
        </button>
        <button type="button" aria-label="Effacer la mise en forme" title="Effacer la mise en forme" disabled={disabled} onMouseDown={event => event.preventDefault()} onClick={cleanFormat}>
          <RemoveFormatting size={16} aria-hidden="true" />
        </button>
      </div>
      {insert && <div className="subject-rich-insert">
        <label className="form-group">Adresse du {insert === 'link' ? 'lien' : insert === 'image' ? 'fichier image' : 'fichier vidéo'}<input className="input" type="url" value={url} onChange={event => setUrl(event.target.value)} /></label>
        <label className="form-group">{insert === 'image' ? 'Description de l’image' : 'Texte du lien'}<input className="input" value={description} onChange={event => setDescription(event.target.value)} /></label>
        <div className="btn-group">
          <button type="button" className="btn btn-outline" onClick={() => {
            const safe = safeSubjectUrl(url);
            if (!safe) { setError('Saisissez une adresse HTTP ou HTTPS complète.'); return; }
            if (insert === 'image' && !description.trim()) { setError('Décrivez l’image pour les lecteurs du sujet.'); return; }
            insertMarkup(insert === 'link' ? `<a href="${escapeSubjectText(safe)}">${escapeSubjectText(description || safe)}</a>`
              : insert === 'image' ? `<img src="${escapeSubjectText(safe)}" alt="${escapeSubjectText(description)}">`
              : `<video src="${escapeSubjectText(safe)}" controls></video>`);
            setInsert(null);
          }}>Insérer</button>
          <button type="button" className="btn btn-outline" onClick={() => setInsert(null)}>Annuler</button>
        </div>
      </div>}
      {showPreview ? (
        <div className="subject-rich-preview-box">
          <SubjectRichText value={value || '<em>(Aucun texte)</em>'} />
        </div>
      ) : (
        <textarea
          ref={textareaRef}
          id={`${id}-input`}
          className="input subject-prompt subject-rich-input"
          value={value}
          onChange={event => handleTextChange(event.target.value)}
          aria-labelledby={`${id}-label`}
          disabled={disabled}
          maxLength={maxLength}
          rows={6}
          placeholder="Rédigez l'énoncé de la question..."
        />
      )}
    </div>
    {error && <p role="alert" className="restricted-box">{error}</p>}
  </div>;
}
