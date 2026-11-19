'use client';
import { useState } from 'react';
import { usePortal } from '@/hooks/usePortal';
import { manageSupport } from '@/services/remoteCampusService';
import type { StudentProgramCorrectionDirectory } from '@/types/studentCorrections';
import WorkPage from '@/components/ui/WorkPage';
import ReviewedForm from '@/components/ui/ReviewedForm';
import DrawerActions from '@/components/ui/DrawerActions';

export default function StudentProgramCorrectionDialog({ ticketId, revision, directory, onClose, onSaved }: {
  ticketId: string; revision: number; directory: StudentProgramCorrectionDirectory; onClose: () => void; onSaved: () => void;
}) {
  const portal = usePortal();
  const enrollments = directory.enrollments.filter(row => row.ticketId === ticketId);
  const [enrollmentId, setEnrollmentId] = useState(enrollments[0]?.id || '');
  const [offeringId, setOfferingId] = useState('');
  const [groupId, setGroupId] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const enrollment = enrollments.find(row => row.id === enrollmentId);
  const offerings = directory.offerings.filter(row => row.siteId === enrollment?.siteId && row.id !== enrollment.offeringId);
  const offering = offerings.find(row => row.id === offeringId);
  const group = offering?.groups.find(row => row.id === groupId);
  async function save() {
    if (busy) return;
    setBusy(true); setError('');
    try {
      await manageSupport({ action: 'correct_program', revision, ticketId, enrollmentId, offeringId, groupId, reason: reason.trim() }, portal.activeRole);
      portal.refreshCampus(); onSaved();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Correction impossible.'); }
    finally { setBusy(false); }
  }
  return <WorkPage title="Corriger la formation" busy={busy} onClose={onClose}>
    <ReviewedForm busy={busy} error={error} onConfirm={() => { void save(); }} confirmLabel="Confirmer la correction"
      fields={[
        { label: 'Filière et niveau', previous: enrollment?.label || '', value: offering?.label || '' },
        { label: 'Groupe', previous: enrollment?.groupLabel || '', value: group?.label || '' },
        { label: 'Motif', value: reason.trim() },
        { label: 'Notes et présences existantes', value: 'Conservées dans leur contexte d’origine' },
        { label: 'Contrats et paiements', value: 'Conservés sans recalcul ni déplacement' },
      ]}
      consequence="La formation et le groupe actuels seront corrigés. Les notes, présences, contrats, paiements et documents existants resteront conservés avec leur historique. Les frais ne seront pas recalculés. La correction et sa résolution seront enregistrées ensemble dans le suivi étudiant."
      validate={() => !enrollment || !offering || !group ? 'Choisissez l’inscription, la formation et le groupe corrects.' : reason.trim().length < 3 ? 'Expliquez le motif de la correction.' : null}>
      <label className="form-group">Inscription à corriger<select className="select-input" required value={enrollmentId} onChange={event => { setEnrollmentId(event.target.value); setOfferingId(''); setGroupId(''); }}>
        {enrollments.map(row => <option key={row.id} value={row.id}>{row.label} · {row.groupLabel}</option>)}
      </select></label>
      <label className="form-group">Filière et niveau corrects<select className="select-input" required value={offeringId} onChange={event => { setOfferingId(event.target.value); setGroupId(''); }}>
        <option value="">Choisir une formation</option>{offerings.map(row => <option key={row.id} value={row.id}>{row.label}</option>)}
      </select></label>
      <label className="form-group">Groupe correct<select className="select-input" required value={groupId} onChange={event => setGroupId(event.target.value)}>
        <option value="">Choisir un groupe</option>{offering?.groups.map(row => <option key={row.id} value={row.id}>{row.label}</option>)}
      </select></label>
      <label className="form-group">Motif de la correction<textarea className="input" required minLength={3} maxLength={1000} value={reason} onChange={event => setReason(event.target.value)} /></label>
      <p className="info-box">Les notes restent liées aux matières déjà évaluées. Cette correction ne crée aucune équivalence de notes et ne modifie aucun montant.</p>
      <DrawerActions><button type="submit" className="btn btn-primary" disabled={busy}>Vérifier la correction</button></DrawerActions>
    </ReviewedForm>
  </WorkPage>;
}
