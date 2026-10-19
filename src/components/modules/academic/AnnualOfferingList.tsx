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
  onEdit?: (row: DatabaseRow) => void;
  onArchive?: (row: DatabaseRow) => void;
  onRemove?: (row: DatabaseRow) => void;
  onRemoveGroup: (group: AnnualOfferingGroup, reason: string) => Promise<void>;
}

export default function AnnualOfferingList({ rows, allRows, snapshot, canEdit, onManage, onRemoveGroup }: Props) {
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
  return <>
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
            {pending.length > 0 ? (
              <span className="pill pill-warning">À valider ({pending.length})</span>
            ) : (
              <span className="pill pill-success">{group.rows.length} niveau(x)</span>
            )}
            {group.rows.some(row => !row.delivery_mode) && <span className="pill pill-warning">Mode à préciser</span>}
          </div>
        </td>
        <td>
          <div className="btn-group" style={{ display: 'inline-flex', flexDirection: 'row', alignItems: 'center', gap: '8px', flexWrap: 'nowrap' }}>
            {canEdit && <IconButton className="btn btn-sm btn-primary" label="Vérifier les niveaux" onClick={() => onManage(group)} />}
            {canEdit && group.rows.every(row => !row.archived_at) && <IconButton className="btn btn-sm btn-outline btn-danger" label="Retirer toute la ligne" onClick={() => { setRemoving(group); setReason(''); setError(''); }} />}
          </div>
        </td>
      </tr>;
    })}
    {!rows.length && <tr><td colSpan={4}>Aucune formation proposée. Choisissez une filière et ses niveaux.</td></tr>}
  </tbody></ResponsiveTable>
  </>;
}
