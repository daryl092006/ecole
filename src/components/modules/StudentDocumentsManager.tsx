import IconButton from '@/components/ui/IconButton';
import FormFeedback from '@/components/ui/FormFeedback';
import { useFeedback } from '@/hooks/useFeedback';
import { displayLabel, displayFileSize } from '@/utils/display';
import { useState, useRef } from 'react';
import { usePortal } from '@/hooks/usePortal';
import { ROLES } from '@/types/permissions';
import type { StudentDocument } from '@/types/application';
import { workflowError } from '@/utils/workflowError';
export default function StudentDocumentsManager({ studentId }: { studentId: string }) {
  const state = usePortal(); const [kind, setKind] = useState<StudentDocument['kind']>('IDENTITE'); const [feedback, setFeedback, feedbackError] = useFeedback(); const [loading, setLoading] = useState(false); const input = useRef<HTMLInputElement>(null);
  const [review, setReview] = useState<{ id: string; status: 'CONFORME' | 'NON_CONFORME' } | null>(null); const [reason, setReason] = useState('');
  const own = !!state.perms.scope.ownDataOnly && state.demoIdentity === studentId; const canUpload = own || state.perms.permissions.includes('student.group.assign'); const canReview = (state.activeRole === ROLES.DA || state.activeRole === ROLES.IT) || state.activeRole === ROLES.LOG;
  const documents = state.campus.data.documents.filter(item => item.studentId === studentId);
  return <div className="document-manager mt-2"><h2>Pièces du dossier</h2>{canUpload && <form onSubmit={async event => {
    event.preventDefault(); const file = input.current?.files?.[0]; if (!file) return; setLoading(true); setFeedback('');
    try {
      if (file.size > 5 * 1024 * 1024 || !['image/jpeg', 'image/png', 'application/pdf'].includes(file.type)) throw new Error('Choisissez un fichier JPEG, PNG ou PDF de 5 Mo maximum.');
      const dataUrl = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error('Lecture du fichier impossible.')); reader.readAsDataURL(file); });
      state.campus.runWorkflow('student.document.add', { studentId, kind, fileName: file.name, mimeType: file.type, size: file.size, dataUrl });
      if (input.current) input.current.value = ''; setFeedback('Pièce déposée, en attente de vérification.');
    } catch (error) { setFeedback(workflowError(error), true); } finally { setLoading(false); }
  }}><div className="form-row"><label className="form-group">Type de pièce<select className="select-input" value={kind} onChange={event => setKind(event.target.value as StudentDocument['kind'])}><option value="IDENTITE">Pièce d’identité</option><option value="BAC">Attestation ou diplôme du bac</option><option value="RELEVE">Relevé antérieur</option><option value="PHOTO">Photo d’identité</option><option value="AUTRE">Autre pièce</option></select></label><label className="form-group">Fichier (PDF, JPEG, PNG · 5 Mo max.)<input className="input" type="file" required accept="application/pdf,image/jpeg,image/png" ref={input} /></label></div><button className="btn btn-outline" disabled={loading}>{loading ? 'Lecture du fichier…' : 'Ajouter la pièce'}</button></form>}
    {documents.map(item => <article className="ledger-item" key={item.id}><div className="catalog-item"><div><strong>{item.fileName}</strong><p className="cell-sub">{displayLabel(item.kind)} · {displayFileSize(item.size)} · {displayLabel(item.status)}</p></div><div className="btn-group"><IconButton className="btn btn-sm btn-outline" onClick={() => {
      const bytes = Uint8Array.from(atob(item.dataUrl.split(',')[1]), character => character.charCodeAt(0)); const url = URL.createObjectURL(new Blob([bytes], { type: item.mimeType })); const link = document.createElement('a'); link.href = url; link.download = item.fileName; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    }} label="Télécharger" />{canReview && <><button className="btn btn-sm btn-outline" onClick={() => { setReview({ id: item.id, status: 'CONFORME' }); setReason(''); }}>Conforme</button><button className="btn btn-sm btn-outline" onClick={() => { setReview({ id: item.id, status: 'NON_CONFORME' }); setReason(''); }}>Non conforme</button></>}</div></div><details><summary>Historique de vérification</summary>{item.history.map((entry, index) => <p className="cell-sub" key={index}>{new Date(entry.date).toLocaleDateString('fr-FR')} · {entry.actor} · {displayLabel(entry.status)} · {entry.reason}</p>)}</details></article>)}{!documents.length && <p className="cell-sub">Aucune pièce déposée.</p>}
    {review && <form className="mt-2" onSubmit={event => { event.preventDefault(); try { state.campus.runWorkflow('student.document.review', { documentId: review.id, status: review.status, reason }); setReview(null); setFeedback('Vérification enregistrée.'); } catch (error) { setFeedback(workflowError(error), true); } }}><label className="form-group">Motif de la vérification<input autoFocus className="input" required minLength={3} maxLength={1000} value={reason} onChange={event => setReason(event.target.value)} /></label><div className="btn-group"><button className="btn btn-primary">Confirmer la vérification</button><IconButton className="btn btn-outline" type="button" onClick={() => setReview(null)} label="Fermer" /></div></form>}<FormFeedback message={feedback} error={feedbackError} />
  </div>;
}
