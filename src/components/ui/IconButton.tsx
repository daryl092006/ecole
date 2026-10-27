import type { ButtonHTMLAttributes } from 'react';
import { Archive, Check, ChevronLeft, ChevronRight, Download, Eye, Pencil, Plus, RefreshCw, Settings2, Trash2, X } from 'lucide-react';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { label: string; showLabel?: boolean };

/** Compact actions retain their full accessible name and a visible hover label. */
export default function IconButton({ label, showLabel = false, className = '', ...props }: Props) {
  const Icon = /fermer|annuler/i.test(label) ? X
    : /modifier|compléter/i.test(label) ? Pencil
    : /archiver/i.test(label) ? Archive
    : /retirer|supprimer/i.test(label) ? Trash2
    : /exporter|télécharger/i.test(label) ? Download
    : /ajouter|créer/i.test(label) ? Plus
    : /réessayer|actualiser/i.test(label) ? RefreshCw
    : /gérer/i.test(label) ? Settings2
    : /précédent|retour/i.test(label) ? ChevronLeft
    : /suivant/i.test(label) ? ChevronRight
    : /valider|confirmer|enregistrer/i.test(label) ? Check : Eye;
  return <button type="button" {...props} className={`${className} icon-action${showLabel ? ' icon-action-with-label' : ''}`.trim()} aria-label={props['aria-label'] || label} title={props.title || label}><Icon size={17} aria-hidden="true" /><span className={showLabel ? undefined : 'sr-only'}>{label}</span></button>;
}
