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

export default function AnnualOfferingList({ rows, allRows, snapshot, canEdit, previousYear, onManage, onEdit, onArchive, onRemove, onRemoveGroup }: Props) {
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
  return <><ResponsiveTable className="data-table"><thead><tr><th>Filière</th><th>Niveaux proposés et modes de formation</th><th>État</th><th>Actions</th></tr></thead><tbody>
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
          <details className="annual-offering-details">
            <summary>Voir les niveaux ({group.rows.length})</summary>
            <div className="annual-offering-details-list">
              {group.rows.map(row => (
                <div className="annual-offering-detail" key={row.id}>
                  <div className="annual-offering-detail-name">
                    <strong>{levelName(row)} · {modeName(row)}</strong>
                  </div>
                  {canEdit && (
                    <div className="btn-group">
                      <IconButton className="btn btn-sm btn-outline" label="Modifier" onClick={() => onEdit(row)} />
                      {row.isPrefilled ? (
                        <IconButton className="btn btn-sm btn-outline" label="Retirer de la proposition" onClick={() => onRemove(row)} />
                      ) : (
                        <IconButton className="btn btn-sm btn-outline" label="Archiver" onClick={() => onArchive(row)} />
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </details>
        </td>
      </tr>;
    })}
    {!rows.length && <tr><td colSpan={4}>Aucune formation proposée. Choisissez une filière et ses niveaux.</td></tr>}
  </tbody></ResponsiveTable>{unresolved.length > 0 && <section aria-label="Propositions à compléter"><h3>À compléter · {unresolved.length} proposition(s)</h3><p>Ces formations n’ont pas de filière identifiable. Choisissez leur filière et leurs niveaux avant de les enregistrer pour cette année.</p>{unresolved.map((group, index) => <div className="annual-offering-detail" key={group.id}><strong>Proposition {index + 1} · {group.rows.map(row => `${levelName(row)} · ${modeName(row)}`).join(' ; ')}</strong><p>Filière à préciser{previousYear ? ` · Origine : ${previousYear}` : ''}</p>{canEdit && <div className="btn-group"><button className="btn btn-sm btn-primary" onClick={() => onManage(group)}>Choisir la filière et les niveaux</button>{group.rows.map(row => row.isPrefilled ? <IconButton key={row.id} className="btn btn-sm btn-outline" label="Retirer de la proposition" onClick={() => onRemove(row)} /> : <IconButton key={row.id} className="btn btn-sm btn-outline" label="Modifier" onClick={() => onEdit(row)} />)}</div>}</div>)}</section>}</>;
}
