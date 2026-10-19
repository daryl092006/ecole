import DrawerActions from '@/components/ui/DrawerActions';
import type { DatabaseRow, RelationalSnapshot } from '@/types/persistence';
import { groupAnnualOfferings, type AnnualOfferingGroup } from '@/services/annualOfferingService';
import ResponsiveTable from '@/components/ui/ResponsiveTable';
import IconButton from '@/components/ui/IconButton';
import { useState } from 'react';

interface Props {
  rows: DatabaseRow[];
  allRows: DatabaseRow[];
  snapshot: RelationalSnapshot;
  canEdit: boolean;
  previousYear?: string;
  onManage: (group: AnnualOfferingGroup) => void;
  onEdit: (row: DatabaseRow) => void;
  onArchive: (row: DatabaseRow) => void;
  onRemove: (row: DatabaseRow) => void;
  onRemoveGroup: (group: AnnualOfferingGroup, reason: string) => Promise<void>;
}

export default function AnnualOfferingList({ rows, allRows, snapshot, canEdit, previousYear, onManage, onEdit, onRemove, onRemoveGroup }: Props) {
  const [removing, setRemoving] = useState<AnnualOfferingGroup | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const levelName = (row: DatabaseRow) => String(snapshot.tables.levels?.find(level => level.id === row.level_id)?.name || row._levelName || 'Niveau à préciser');
  const modeName = (row: DatabaseRow) => String(row.delivery_mode || 'Mode à préciser');
  const visible = new Set(rows.map(row => row.id));
  const groups = groupAnnualOfferings(allRows, snapshot).filter(group => group.rows.some(row => visible.has(row.id)));
  const unresolved = groups.filter(group => !group.programId);
  if (removing) return <form aria-label="Retirer une filière de l’année" onSubmit={event => {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError('');
    void onRemoveGroup(removing, reason).then(() => setRemoving(null)).catch(cause => setError(cause instanceof Error ? cause.message : 'Retrait impossible.')).finally(() => setBusy(false));
  }}><h3>Retirer toute la ligne « {removing.name} » ?</h3><p>Les {removing.rows.length} niveaux et modes suivants seront retirés de la liste active :</p><ul>{removing.rows.map(row => <li key={row.id}>{levelName(row)} · {modeName(row)} — {row.isPrefilled ? 'proposition' : 'enregistré'}</li>)}</ul><p>Les formations enregistrées seront archivées avec leur historique. Les propositions seront écartées de cette préparation en cours.</p>{error && <p role="alert">{error}</p>}<fieldset disabled={busy}><label className="form-group">Motif du retrait<textarea className="input" required minLength={3} maxLength={1000} value={reason} onChange={event => setReason(event.target.value)} /></label><DrawerActions><button type="button" className="btn btn-outline" onClick={() => setRemoving(null)}>Conserver la ligne</button><button className="btn btn-danger">{busy ? 'Retrait en cours…' : 'Confirmer le retrait de toute la ligne'}</button></DrawerActions></fieldset></form>;
  const hasPrefilled = groups.some(g => g.rows.some(r => r.isPrefilled));
  return <>
    {hasPrefilled && (
      <div className="info-box" style={{ marginBottom: '1rem' }}>
        <span>💡</span>
        <div>
          <strong>Formations suggérées d’après {previousYear || "l'année précédente"}</strong> :
          ces filières et niveaux sont pré-remplis pour faciliter la préparation. Cliquez sur <em>« Vérifier les niveaux »</em> sur chaque filière pour confirmer son ouverture pour cette année.
        </div>
      </div>
    )}
    <ResponsiveTable className="data-table"><thead><tr><th>Filière</th><th>Niveaux proposés et modes de formation</th><th>État</th><th>Actions</th></tr></thead><tbody>
    {groups.filter(group => group.programId).map(group => {
      const pending = group.rows.filter(row => row.isPrefilled);
      return <tr key={group.id}>
        <td><strong className="annual-offering-program">{group.name}</strong></td>
        <td>
          <ul className="annual-offering-levels-list">
            {group.rows.map(row => (
              <li key={row.id}>
                <span>{levelName(row)}</span>
                <span className="annual-offering-mode-tag">{modeName(row)}</span>
              </li>
            ))}
          </ul>
        </td>
        <td>
          <div className="annual-offering-status-cell">
            {group.rows.length - pending.length > 0 && <div>{group.rows.length - pending.length} niveau(x) et mode(s) enregistré(s)</div>}
            {group.rows.some(row => !row.delivery_mode) && <span className="pill pill-warning">Mode de formation à préciser</span>}
            {pending.length > 0 && <div><span className="pill pill-warning">Niveaux et modes à confirmer</span><div className="cell-sub">{pending.length} proposition(s){previousYear ? ` d’après ${previousYear}` : ''} · non enregistrées pour cette année</div></div>}
          </div>
        </td>
        <td>
          <div className="btn-group">
            {canEdit && <button className="btn btn-sm btn-primary" onClick={() => onManage(group)}>{pending.length ? 'Vérifier les niveaux' : 'Ajouter des niveaux'}</button>}
            {canEdit && group.rows.every(row => !row.archived_at) && <button className="btn btn-sm btn-outline btn-danger" onClick={() => { setRemoving(group); setReason(''); setError(''); }}>Retirer toute la ligne</button>}
          </div>
        </td>
      </tr>;
    })}
    {!rows.length && <tr><td colSpan={4}>Aucune formation proposée. Choisissez une filière et ses niveaux.</td></tr>}
  </tbody></ResponsiveTable>
  {unresolved.length > 0 && <section aria-label="Propositions à compléter" className="card card-warning" style={{ marginTop: '1.5rem', borderLeft: '4px solid var(--warning, #eab308)', padding: '1.25rem' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
      <span className="pill pill-warning">À compléter</span>
      <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>{unresolved.length} proposition(s) sans filière</h3>
    </div>
    <p className="cell-sub" style={{ margin: '0 0 1rem' }}>Ces formations n’ont pas de filière identifiable. Choisissez leur filière et leurs niveaux avant de les enregistrer pour cette année.</p>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {unresolved.map((group, index) => <div className="annual-offering-detail" key={group.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <strong>Proposition {index + 1} · {group.rows.map(row => `${levelName(row)} · ${modeName(row)}`).join(' ; ')}</strong>
          <p className="cell-sub" style={{ margin: '0.2rem 0 0' }}>Filière à préciser{previousYear ? ` · Origine : ${previousYear}` : ''}</p>
        </div>
        {canEdit && <div className="btn-group">
          <button className="btn btn-sm btn-primary" onClick={() => onManage(group)}>Choisir la filière et les niveaux</button>
          {group.rows.map(row => row.isPrefilled ? <IconButton key={row.id} className="btn btn-sm btn-outline" label="Retirer de la proposition" onClick={() => onRemove(row)} /> : <IconButton key={row.id} className="btn btn-sm btn-outline" label="Modifier" onClick={() => onEdit(row)} />)}
        </div>}
      </div>)}
    </div>
  </section>}
  </>;
}
