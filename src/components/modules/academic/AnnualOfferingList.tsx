import DrawerActions from '@/components/ui/DrawerActions';
import type { DatabaseRow, RelationalSnapshot } from '@/types/persistence';
import { groupAnnualOfferings, type AnnualOfferingGroup } from '@/services/annualOfferingService';
import ResponsiveTable from '@/components/ui/ResponsiveTable';
import { useState } from 'react';

interface Props {
  rows: DatabaseRow[];
  allRows: DatabaseRow[];
  snapshot: RelationalSnapshot;
  canEdit: boolean;
  previousYear?: string;
  onManage: (group: AnnualOfferingGroup) => void;
  onEdit?: (row: DatabaseRow) => void;
  onArchive?: (row: DatabaseRow) => void;
  onRemove?: (row: DatabaseRow) => void;
  onRemoveGroup: (group: AnnualOfferingGroup, reason: string) => Promise<void>;
}

export default function AnnualOfferingList({ rows, allRows, snapshot, canEdit, previousYear, onManage, onRemoveGroup }: Props) {
  const [removing, setRemoving] = useState<AnnualOfferingGroup | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const levelName = (row: DatabaseRow) => String(snapshot.tables.levels?.find(level => level.id === row.level_id)?.name || row._levelName || 'Niveau à préciser');
  const modeName = (row: DatabaseRow) => String(row.delivery_mode || 'Mode à préciser');
  const visible = new Set(rows.map(row => row.id));
  const groups = groupAnnualOfferings(allRows, snapshot).filter(group => group.rows.some(row => visible.has(row.id)));
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
            {canEdit && <button className="btn btn-sm btn-primary" onClick={() => onManage(group)} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              <span>{pending.length ? 'Vérifier les niveaux' : 'Ajouter des niveaux'}</span>
            </button>}
            {canEdit && group.rows.every(row => !row.archived_at) && <button className="btn btn-sm btn-outline btn-danger" onClick={() => { setRemoving(group); setReason(''); setError(''); }} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
              <span>Retirer toute la ligne</span>
            </button>}
          </div>
        </td>
      </tr>;
    })}
    {!rows.length && <tr><td colSpan={4}>Aucune formation proposée. Choisissez une filière et ses niveaux.</td></tr>}
  </tbody></ResponsiveTable>
  </>;
}
