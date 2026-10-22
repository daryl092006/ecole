'use client';
import { useState } from 'react';
import WorkPage from '@/components/ui/WorkPage';
import ReviewedForm from '@/components/ui/ReviewedForm';
import DrawerActions from '@/components/ui/DrawerActions';
import { DOCUMENT_LABELS } from '@/services/websiteService';
import type { WebsiteLevelGroup } from '@/services/websiteLevelDocumentsService';

export default function WebsiteLevelDocumentsEditor({ group, busy, error, reason, onReason, onClose, onSave }: {
  group: WebsiteLevelGroup; busy: boolean; error: string; reason: string;
  onReason: (value: string) => void; onClose: () => void; onSave: (values: Record<string, unknown>) => void;
}) {
  const [documents, setDocuments] = useState(group.documents);
  const describe = (keys: string[]) => keys.map(key => DOCUMENT_LABELS[key] || key).join(', ') || 'Aucune pièce obligatoire';
  const programs = [...new Set(group.intakes.map(item => item.program_name || item.label))];
  return <WorkPage title={`Pièces communes · ${group.levelName} · ${group.yearName}`} busy={busy} onClose={onClose}>
    <ReviewedForm className="card" busy={busy} error={error} confirmLabel="Confirmer les pièces du niveau" fields={[
      { label: 'Année', value: group.yearName }, { label: 'Niveau', value: group.levelName },
      { label: 'Filières concernées', value: programs.join(', ') },
      { label: 'Pièces obligatoires', value: describe(documents), previous: group.conflicting ? group.intakes.map(item => `${item.program_name || item.label} : ${describe(item.required_documents)}`).join(' ; ') : describe(group.documents) },
      { label: 'Motif', value: reason },
    ]} consequence={`Ces pièces s’appliqueront aux ${group.intakes.length} campagnes de ce niveau pour ${group.yearName}, ouvertes ou fermées, ainsi qu’aux futures filières de ce niveau. Les autres niveaux, les autres années et les dossiers reçus restent conservés.`} onConfirm={() => onSave({ action: 'level-documents-save', academic_year_id: group.yearId, level_id: group.levelId, required_documents: documents, expected_intakes: group.intakes.map(item => ({ id: item.id, version: item.version })), expected_rule_version: group.rule?.version ?? null })}>
      <h2>{group.levelName} · {group.yearName}</h2>
      <p>Une seule règle commune à toutes les filières de ce niveau : {programs.join(', ')}.</p>
      {group.conflicting && <div className="restricted-box" role="alert"><p>Les anciennes campagnes demandent des pièces différentes. Choisissez explicitement les pièces communes ; aucune fusion automatique n’est faite.</p><ul>{group.intakes.map(item => <li key={item.id}>{item.program_name || item.label} : {describe(item.required_documents)}</li>)}</ul></div>}
      {error && <p role="alert" className="auth-error">{error}</p>}
      <fieldset><legend>Pièces obligatoires pour ce niveau</legend>{Object.entries(DOCUMENT_LABELS).map(([key, label]) => <label key={key} className="form-group"><span><input type="checkbox" checked={documents.includes(key)} onChange={event => setDocuments(values => event.target.checked ? [...values, key] : values.filter(value => value !== key))} /> {label}</span></label>)}</fieldset>
      <label className="form-group">Motif de la configuration<textarea className="input" required minLength={3} maxLength={1000} value={reason} onChange={event => onReason(event.target.value)} /></label>
      <DrawerActions><button className="btn btn-primary" disabled={busy}>Relire les pièces du niveau</button></DrawerActions>
    </ReviewedForm>
  </WorkPage>;
}
