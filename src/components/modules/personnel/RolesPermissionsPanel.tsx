import ResponsiveTable from '@/components/ui/ResponsiveTable';
import { useRef, useState } from 'react';
import type { RoleName } from '@/types';
import type { DemoUser } from '@/types/user';
import { ROLES } from '@/types/permissions';
import { getPermissionCatalog, getRolePermissionSummary } from '@/services/permissionCatalogService';
import RolePermissionDetails from './RolePermissionDetails';

interface Props { mode: 'roles' | 'permissions'; users: DemoUser[]; actor: RoleName; }
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr');

export default function RolesPermissionsPanel({ mode, users, actor }: Props) {
  const [selected, setSelected] = useState<RoleName>(actor);
  const detailHeading = useRef<HTMLHeadingElement>(null);
  const [comparison, setComparison] = useState<RoleName>(actor === ROLES.IT ? ROLES.DG : ROLES.IT);
  const [query, setQuery] = useState(''); const [domainId, setDomainId] = useState(''); const [differences, setDifferences] = useState(false);
  const roles = Object.values(ROLES);
  const catalog = getPermissionCatalog(actor);
  const primary = getRolePermissionSummary(selected, actor);
  const secondary = getRolePermissionSummary(comparison, actor);
  const roleOptions = roles.map(role => <option key={role}>{role}</option>);
  const filteredRoles = roles.filter(role => normalize(`${role} ${getRolePermissionSummary(role, actor).description}`).includes(normalize(query.trim())));
  const comparedPermissions = new Map(secondary.domains.flatMap(domain => domain.permissions).map(permission => [permission.code, permission.granted]));
  const rows = primary.domains.filter(domain => !domainId || domain.id === domainId).flatMap(domain => domain.permissions.map(permission => ({ ...permission, domain: domain.label, compared: comparedPermissions.get(permission.code) || false })))
    .filter(row => (!differences || row.granted !== row.compared) && normalize(`${row.label} ${row.domain}`).includes(normalize(query.trim())));
  return <div>
    <div className="module-header"><h1>{mode === 'roles' ? 'Rôles ESCEN' : 'Matrice des permissions'}</h1></div>
    {mode === 'roles' ? <div className="roles-overview">
      <div className="card"><h2>Catalogue ({roles.length})</h2><label className="form-group mt-2">Rechercher un rôle<input className="input" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Nom du rôle ou responsabilité" /></label>
        <div className="role-catalog mt-2">{filteredRoles.map(role => { const count = getRolePermissionSummary(role, actor).count; return <button className={`role-catalog-item ${selected === role ? 'selected' : ''}`} key={role} aria-pressed={selected === role} onClick={() => { setSelected(role); requestAnimationFrame(() => detailHeading.current?.focus()); }}><strong>{role}</strong><span>{count} permission(s) · {users.filter(user => user.roles?.includes(role) || user.role === role).length} utilisateur(s)</span></button>; })}</div>
        {!filteredRoles.length && <p className="cell-sub mt-2">Aucun rôle ne correspond à cette recherche.</p>}
      </div><div className="card"><h2 ref={detailHeading} tabIndex={-1}>Droits du rôle : {selected}</h2><RolePermissionDetails summary={primary} /></div>
    </div> : <>
      <div className="card card-full mb-2"><div className="form-grid"><label className="form-group">Rôle à consulter<select className="select-input" value={selected} onChange={event => setSelected(event.target.value as RoleName)}>{roleOptions}</select></label><label className="form-group">Comparer avec<select className="select-input" value={comparison} onChange={event => setComparison(event.target.value as RoleName)}>{roleOptions}</select></label></div>
        <div className="permission-scope-grid"><div><strong>{primary.count} droits attribués</strong><details><summary>Périmètre de {selected}</summary><p>{primary.scope}</p></details></div><div><strong>{secondary.count} droits attribués</strong><details><summary>Périmètre de {comparison}</summary><p>{secondary.scope}</p></details></div></div>
        <div className="form-row mt-2"><label className="form-group">Domaine<select className="select-input" value={domainId} onChange={event => setDomainId(event.target.value)}><option value="">Tous les domaines</option>{catalog.map(domain => <option key={domain.id} value={domain.id}>{domain.label}</option>)}</select></label><label className="form-group">Rechercher une permission<input className="input" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Valider les notes, encaisser, gérer les accès…" /></label></div>
        <label className="checkbox-field"><input type="checkbox" checked={differences} onChange={event => setDifferences(event.target.checked)} /> Afficher les différences uniquement</label><button className="btn btn-outline" onClick={() => { setQuery(''); setDomainId(''); setDifferences(false); }}>Réinitialiser les filtres</button>
      </div><div className="card card-full"><h2>Actions autorisées ({rows.length})</h2><div className="table-wrap"><ResponsiveTable mobileLayout="scroll" className="data-table permission-matrix"><thead><tr><th>Domaine</th><th>Action</th><th>{selected}</th><th>{comparison}</th></tr></thead><tbody>{rows.map(row => <tr key={row.code}><td>{row.domain}</td><td>{row.label}</td><td><span className={`pill ${row.granted ? 'pill-success' : 'pill-default'}`}>{row.granted ? 'Autorisé' : 'Non attribué'}</span></td><td><span className={`pill ${row.compared ? 'pill-success' : 'pill-default'}`}>{row.compared ? 'Autorisé' : 'Non attribué'}</span></td></tr>)}{!rows.length && <tr><td colSpan={4}>Aucune permission ne correspond aux filtres sélectionnés.</td></tr>}</tbody></ResponsiveTable></div></div>
    </>}
  </div>;
}
