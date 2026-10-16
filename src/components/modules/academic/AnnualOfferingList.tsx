import type { DatabaseRow, RelationalSnapshot } from '@/types/persistence';
import { groupAnnualOfferings, type AnnualOfferingGroup } from '@/services/annualOfferingService';
import ResponsiveTable from '@/components/ui/ResponsiveTable';
import IconButton from '@/components/ui/IconButton';

interface Props {
  rows: DatabaseRow[];
  snapshot: RelationalSnapshot;
  canEdit: boolean;
  previousYear?: string;
  onManage: (group: AnnualOfferingGroup) => void;
  onEdit: (row: DatabaseRow) => void;
  onArchive: (row: DatabaseRow) => void;
  onRemove: (row: DatabaseRow) => void;
}

export default function AnnualOfferingList({ rows, snapshot, canEdit, previousYear, onManage, onEdit, onArchive, onRemove }: Props) {
  const levelName = (row: DatabaseRow) => String(snapshot.tables.levels?.find(level => level.id === row.level_id)?.name || row._levelName || 'Niveau à préciser');
  const modeName = (row: DatabaseRow) => String(row.delivery_mode || 'Mode non renseigné');
  return <ResponsiveTable className="data-table"><thead><tr><th>Filière</th><th>Niveaux proposés et modes de formation</th><th>État</th><th>Actions</th></tr></thead><tbody>
    {groupAnnualOfferings(rows, snapshot).map(group => {
      const pending = group.rows.filter(row => row.isPrefilled);
      return <tr key={group.id}><td><strong>{group.name}</strong></td><td>
        {group.rows.map(row => <div key={row.id}>{levelName(row)} · {modeName(row)}</div>)}
      </td><td>{group.rows.length - pending.length > 0 && <div>{group.rows.length - pending.length} niveau(x) et mode(s) enregistré(s)</div>}{pending.length > 0 && <div><span className="pill pill-warning">En attente de validation</span><div className="cell-sub">{pending.length} proposition(s){previousYear ? ` d’après ${previousYear}` : ''}</div></div>}</td><td>
        {canEdit && <button className="btn btn-sm btn-primary" onClick={() => onManage(group)}>{pending.length ? 'Vérifier les niveaux' : 'Ajouter des niveaux'}</button>}
        <details><summary>Voir les niveaux</summary>{group.rows.map(row => <div className="annual-offering-detail" key={row.id}><strong>{levelName(row)} · {modeName(row)}</strong>{canEdit && <div className="btn-group"><IconButton className="btn btn-sm btn-outline" label="Modifier" onClick={() => onEdit(row)} />{row.isPrefilled ? <IconButton className="btn btn-sm btn-outline" label="Retirer de la proposition" onClick={() => onRemove(row)} /> : <IconButton className="btn btn-sm btn-outline" label="Archiver" onClick={() => onArchive(row)} />}</div>}</div>)}</details>
      </td></tr>;
    })}
    {!rows.length && <tr><td colSpan={4}>Aucune formation proposée. Choisissez une filière et ses niveaux.</td></tr>}
  </tbody></ResponsiveTable>;
}
