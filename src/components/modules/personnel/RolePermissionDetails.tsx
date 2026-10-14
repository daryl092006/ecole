import type { getRolePermissionSummary } from '@/services/permissionCatalogService';

export default function RolePermissionDetails({ summary }: { summary: ReturnType<typeof getRolePermissionSummary> }) {
  return <div>
    <p className="confirmation-context mt-2"><strong>Périmètre : </strong>{summary.scope}</p>
    <p className="cell-sub">{summary.count} permission(s) attribuée(s) à ce rôle.</p>
    <div className="permission-domains mt-2">{summary.domains.map(domain => {
      const granted = domain.permissions.filter(permission => permission.granted);
      return granted.length ? <section className="permission-domain" key={domain.id}><h3>{domain.label} <span className="cell-sub">({granted.length})</span></h3><ul>{granted.map(permission => <li key={permission.code}>{permission.label}</li>)}</ul></section> : null;
    })}</div>
    {!summary.count && <div className="empty-state"><strong>Aucune permission métier automatique</strong><span>Ce rôle ne donne aucun droit de gestion académique, financière ou administrative.</span></div>}
  </div>;
}
