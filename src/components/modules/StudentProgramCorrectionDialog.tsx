'use client';
import { useState } from 'react';
import { usePortal } from '@/hooks/usePortal';
import { manageSupport } from '@/services/remoteCampusService';
import type { StudentProgramCorrectionDirectory } from '@/types/studentCorrections';
import WorkPage from '@/components/ui/WorkPage';
import ReviewedForm from '@/components/ui/ReviewedForm';
import DrawerActions from '@/components/ui/DrawerActions';

export default function StudentProgramCorrectionDialog({ ticketId, revision, directory, onClose, onSaved }: {
  ticketId: string; revision: number; directory: StudentProgramCorrectionDirectory; onClose: () => void; onSaved: (result: 'verified' | 'corrected') => void;
}) {
  const portal = usePortal();
  const enrollments = directory.enrollments.filter(row => row.ticketId === ticketId);
  const [enrollmentId, setEnrollmentId] = useState(enrollments[0]?.id || '');
  const [offeringId, setOfferingId] = useState(enrollments[0]?.suggestedOfferingId || '');
  const [groupId, setGroupId] = useState(enrollments[0]?.suggestedGroupId || '');
  const [reason, setReason] = useState(enrollments[0]?.suggestedOfferingId === enrollments[0]?.offeringId && enrollments[0] ? 'Formation déclarée conforme à l’inscription de l’année en cours.' : '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const enrollment = enrollments.find(row => row.id === enrollmentId);
  const offerings = directory.offerings.filter(row => row.siteId === enrollment?.siteId && (row.id !== enrollment.offeringId || row.id === enrollment.suggestedOfferingId));
  const alreadyCorrect = Boolean(enrollment && offeringId === enrollment.offeringId && enrollment.suggestedOfferingId === enrollment.offeringId);
  const offering = offerings.find(row => row.id === offeringId);
  const group = offering?.groups.find(row => row.id === groupId);
  async function save() {
    if (busy) return;
    setBusy(true); setError('');
    try {
      await manageSupport(alreadyCorrect
        ? { action: 'confirm_program', revision, ticketId, enrollmentId, reason: reason.trim() }
        : { action: 'correct_program', revision, ticketId, enrollmentId, offeringId, groupId, reason: reason.trim() }, portal.activeRole);
      portal.refreshCampus(); onSaved(alreadyCorrect ? 'verified' : 'corrected');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Correction impossible.'); }
    finally { setBusy(false); }
  }
  return <WorkPage title="Corriger la formation" busy={busy} onClose={onClose}>
    <ReviewedForm busy={busy} error={error} onConfirm={() => { void save(); }} confirmLabel={alreadyCorrect ? 'Confirmer la vérification' : 'Confirmer la correction'}
      fields={[
        { label: 'Filière et niveau', previous: enrollment?.label || '', value: offering?.label || '' },
        { label: 'Groupe', previous: enrollment?.groupLabel || '', value: alreadyCorrect ? enrollment?.groupLabel || '' : group?.label || '' },
        { label: 'Motif', value: reason.trim() },
        { label: 'Notes et présences existantes', value: 'Conservées dans leur contexte d’origine' },
        { label: 'Contrats et paiements', value: 'Conservés sans recalcul ni déplacement' },
      ]}
      consequence={alreadyCorrect ? 'La formation demandée est déjà enregistrée. La demande sera résolue avec une trace de votre vérification. L’inscription, le groupe, les notes et les montants resteront inchangés.' : 'La formation et le groupe actuels seront corrigés. Les notes, présences, contrats, paiements et documents existants resteront conservés avec leur historique. Les frais ne seront pas recalculés. La correction et sa résolution seront enregistrées ensemble dans le suivi étudiant.'}
      validate={() => !enrollment || !offering || !alreadyCorrect && !group ? 'Choisissez l’inscription, la formation et le groupe corrects.' : reason.trim().length < 3 ? 'Expliquez le motif de la correction.' : null}>
      {alreadyCorrect && <p className="info-box">La formation demandée par l’étudiant est déjà enregistrée : {enrollment?.label}. Confirmez la vérification pour résoudre la demande sans modifier son inscription.</p>}
      <label className="form-group">Inscription à corriger<select className="select-input" required value={enrollmentId} onChange={event => { const next = enrollments.find(row => row.id === event.target.value); setEnrollmentId(event.target.value); setOfferingId(next?.suggestedOfferingId || ''); setGroupId(next?.suggestedGroupId || ''); }}>
        {enrollments.map(row => <option key={row.id} value={row.id}>{row.label} · {row.groupLabel}</option>)}
      </select></label>
      <label className="form-group">Filière et niveau corrects<select className="select-input" required value={offeringId} onChange={event => { const next = offerings.find(row => row.id === event.target.value); setOfferingId(event.target.value); setGroupId(next?.groups.length === 1 ? next.groups[0].id : ''); }}>
        <option value="">Choisir une formation</option>{offerings.map(row => <option key={row.id} value={row.id}>{row.label}</option>)}
      </select></label>
      {alreadyCorrect ? <p>Groupe actuel conservé : {enrollment?.groupLabel}</p> : <label className="form-group">Groupe correct<select className="select-input" required value={groupId} onChange={event => setGroupId(event.target.value)}>
        <option value="">Choisir un groupe</option>{offering?.groups.map(row => <option key={row.id} value={row.id}>{row.label}</option>)}
      </select></label>}
      <label className="form-group">Motif de la correction<textarea className="input" required minLength={3} maxLength={1000} value={reason} onChange={event => setReason(event.target.value)} /></label>
      <p className="info-box">Les notes restent liées aux matières déjà évaluées. Cette correction ne crée aucune équivalence de notes et ne modifie aucun montant.</p>
      <DrawerActions><button type="submit" className="btn btn-primary" disabled={busy}>Vérifier la correction</button></DrawerActions>
    </ReviewedForm>
  </WorkPage>;
}
