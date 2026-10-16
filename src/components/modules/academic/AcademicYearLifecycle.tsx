'use client';
import IconButton from '@/components/ui/IconButton';
import YearPreparationPanel from './YearPreparationPanel';
import YearClosurePanel from './YearClosurePanel';
import { useState } from 'react';
import { usePortal } from '@/hooks/usePortal';
import { changeAcademicYear } from '@/services/remoteCampusService';
import { YEAR_STATUS_LABELS, type YearStatus } from '@/types/academicYearContext';
import type { DatabaseRow } from '@/types/persistence';
import WorkPage from '@/components/ui/WorkPage';
import ReviewedForm from '@/components/ui/ReviewedForm';
interface Command { action: 'current' | 'transition'; yearId: string | null; status?: string; title: string; revision?: number; }
export default function AcademicYearLifecycle({ rows, revision, onSaved, onEdit, onView }: { rows: DatabaseRow[]; revision: number; onSaved: () => void; onEdit?: (row: DatabaseRow) => void; onView?: (row: DatabaseRow) => void }) {
  const portal = usePortal(); const [command, setCommand] = useState<Command | null>(null);
  const [reason, setReason] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const canManage = portal.globalAccess && portal.perms.permissions.includes('academic.year.open');
  const [preparing,setPreparing]=useState<string|null>(null);
  const [reviewing, setReviewing] = useState<DatabaseRow | null>(null);
  const opened = rows.filter(year => year.status === 'OUVERTE');
  const currentId = portal.academicYearContext?.currentYearId;
  const current = rows.find(row => row.id === currentId);
  function open(next: Command) { setCommand(next); setReason(''); setError(''); }
  return <section className="card mb-2"><div className="card-header"><h2>Années scolaires</h2></div><p>Année de travail : <strong>{current ? String(current.name) : 'Aucune année de travail désignée'}</strong></p><p>Une seule année peut être ouverte. Vous pouvez préparer la suivante en brouillon. Changer l’année consultée ne change pas l’année de travail.</p>
    {opened.length > 0 && <p role="status">Ouverture d’une autre année bloquée : {opened.map(year => String(year.name)).join(', ')} {opened.length > 1 ? 'sont encore ouvertes. Cette anomalie doit être examinée.' : 'est encore ouverte.'}</p>}
    {canManage && current && <button className="btn btn-outline" onClick={() => open({ action: 'current', yearId: null, title: `Retirer ${current.name} comme année de travail` })}>Retirer la désignation de l’année de travail</button>}

    {rows.filter(row => !row.archived_at).map(year => {
      const status = year.status as YearStatus;
      return <div key={year.id} className="academic-year-row"><div><strong>{String(year.name)}</strong><p className="cell-sub">{YEAR_STATUS_LABELS[status] || 'État à vérifier'}{year.id === currentId ? ' · Année de travail' : ''}</p><p className="cell-sub">{String(year.starts_on || '').split('-').reverse().join('/')} — {String(year.ends_on || '').split('-').reverse().join('/')}</p></div><div className="btn-group">{onView && <IconButton className="btn btn-outline" onClick={() => onView(year)} label="Voir" />}{onEdit && <IconButton className="btn btn-outline" onClick={() => onEdit(year)} label="Modifier" />}{canManage && <><button className="btn btn-outline" onClick={()=>setPreparing(year.id)}>{status === 'BROUILLON' ? 'Préparer' : 'Configurer'} {String(year.name)}</button>
        {status === 'BROUILLON' && <button className="btn btn-outline" disabled={opened.length > 0} onClick={() => open({ action: 'transition', yearId: year.id, status: 'OUVERTE', title: `Ouvrir ${year.name}` })}>Ouvrir l’année {String(year.name)}</button>}
        {status === 'OUVERTE' && year.id !== currentId && <button className="btn btn-primary" onClick={() => open({ action: 'current', yearId: year.id, title: `Définir ${year.name} comme année de travail` })}>Utiliser {String(year.name)} comme année de travail</button>}
        {status === 'OUVERTE' && <button className="btn btn-outline" disabled={year.id === currentId} title={year.id === currentId ? 'Changez ou retirez d’abord la désignation de l’année de travail.' : undefined} onClick={() => open({ action: 'transition', yearId: year.id, status: 'EN_CLOTURE', title: `Préparer la clôture de ${year.name}` })}>Préparer la clôture de {String(year.name)}</button>}
        {['OUVERTE', 'EN_CLOTURE'].includes(status) && <button className="btn btn-outline" onClick={() => setReviewing(year)}>Bilan avant clôture de {String(year.name)}</button>}
      </>}</div></div>;
    })}
    {preparing && <YearPreparationPanel key={preparing} yearId={preparing} yearName={String(rows.find(year => year.id === preparing)?.name || preparing)} onClose={() => { setPreparing(null); onSaved(); }} />}
    {reviewing && <YearClosurePanel yearId={reviewing.id} yearName={String(reviewing.name)} canClose={reviewing.status === 'EN_CLOTURE'} onClose={() => setReviewing(null)} onConfirm={reviewRevision => { open({ action: 'transition', yearId: reviewing.id, status: 'CLOTUREE', title: `Clôturer ${reviewing.name}`, revision: reviewRevision }); setReviewing(null); }} />}
    {command && <WorkPage title={command.title} busy={busy} onClose={() => setCommand(null)}><ReviewedForm busy={busy} error={error} confirmLabel="Confirmer le changement d’année" fields={[{ label: 'Opération', value: command.title }, { label: 'Motif', value: reason }]} consequence={command.action === 'current' && command.yearId === null ? 'Aucune année ne sera désignée pour les nouvelles opérations par défaut. Les nouvelles demandes du site seront suspendues. Les dossiers existants garderont leur année. Vous pourrez ensuite préparer la clôture.' : command.action === 'current' ? 'La consultation des autres années et tous les historiques seront conservés. Les dossiers commencés sur le site garderont leur année de dépôt.' : command.status === 'CLOTUREE' ? 'La clôture protège les écritures académiques de cette année. Les évaluations et réclamations doivent être terminées. Les dettes et leurs règlements restent rattachés à leur année d’origine.' : command.status === 'EN_CLOTURE' ? 'Les nouvelles inscriptions et programmations seront bloquées. La finalisation des notes et réclamations restera possible.' : 'L’année autorisera les opérations académiques prévues. Elle ne sera pas automatiquement désignée année de travail et aucune inscription ne sera créée.'} onConfirm={() => {
      setBusy(true); setError('');
      void changeAcademicYear({ action: command.action, yearId: command.yearId, status: command.status, revision: command.revision ?? revision, reason }, portal.activeRole).then(() => { setCommand(null); portal.reloadCampus(); onSaved(); }).catch(cause => setError(cause instanceof Error ? cause.message : 'Changement refusé.')).finally(() => setBusy(false));
    }}><label className="form-group">Motif du changement<textarea aria-label="Motif du changement" className="input" required minLength={3} maxLength={1000} value={reason} onChange={event => setReason(event.target.value)} /></label><button className="btn btn-primary" disabled={busy}>Vérifier les conséquences</button></ReviewedForm></WorkPage>}
  </section>;
}
