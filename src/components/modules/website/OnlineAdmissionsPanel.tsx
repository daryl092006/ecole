'use client';
import DrawerActions from '@/components/ui/DrawerActions';
import IconButton from '@/components/ui/IconButton';
import CatalogTaskDialog from '@/components/modules/academic/CatalogTaskDialog';
import LoadingState from '@/components/ui/LoadingState';
import { useEffect, useState, type ReactNode } from 'react';
import { usePortal } from '@/hooks/usePortal';
import { downloadApplicationDocument, loadWebsiteData, saveWebsiteData } from '@/services/remoteCampusService';
import { DOCUMENT_LABELS } from '@/services/websiteService';
import type { OnlineApplication, WebsiteIntake, WebsiteManagement } from '@/types/website';
import WorkPage from '@/components/ui/WorkPage';
import FormFeedback from '@/components/ui/FormFeedback';
import Link from 'next/link';
import ResponsiveTable from '@/components/ui/ResponsiveTable';

function AdmissionsFrame({ title, onClose, children }: { title: string; onClose?: () => void; children: ReactNode }) {
  return onClose ? <WorkPage title={title} onClose={onClose}>{children}</WorkPage> : <div className="domain-workspace"><div className="page-intro"><div><span className="page-eyebrow">SITE WEB</span><h1>{title}</h1></div></div>{children}</div>;
}

export default function OnlineAdmissionsPanel({ onClose, mode = 'applications' }: { onClose?: () => void; mode?: 'applications' | 'configuration' }) {
  const state = usePortal(); const role = state.activeRole;
  const canManage = (!state.academicYearContext || !!state.academicYearContext.selectedYearId) && state.perms.permissions.includes('student.lifecycle.manage') && state.session?.capabilities?.[role]?.globalAccess;
  const [levelFilter, setLevelFilter] = useState('');
  const [baseTask, setBaseTask] = useState<'programs' | 'levels' | null>(null);
  const [data, setData] = useState<WebsiteManagement | null>(null);
  const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false); const [revision, setRevision] = useState(0);
  const [success, setSuccess] = useState('');
  const [selected, setSelected] = useState<OnlineApplication | null>(null);
  const [intake, setIntake] = useState<WebsiteIntake | null>(null);
  const [reason, setReason] = useState(''); const [status, setStatus] = useState('EN_ANALYSE');
  const [confirm, setConfirm] = useState(false); const [filter, setFilter] = useState('');
  useEffect(() => {
    const controller = new AbortController(); setData(null); setSelected(null); setIntake(null); setMessage('');
    loadWebsiteData<WebsiteManagement>('admissions', role, controller.signal).then(value => { if (!controller.signal.aborted) setData(value); }).catch(error => { if (!controller.signal.aborted) setMessage(error.message); });
    return () => controller.abort();
  }, [role, revision, state.academicYearSelection]);
  async function save(values: Record<string, unknown>) {
    setBusy(true); setMessage('');
    try { await saveWebsiteData({ ...values, reason }, role); setSelected(null); setIntake(null); setConfirm(false); setRevision(value => value + 1); setSuccess(values.action === 'application-status' ? 'Suivi du dossier enregistré. Ce suivi ne vaut pas admission.' : 'Configuration de la formation enregistrée.'); state.refreshCampus(); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Enregistrement impossible.'); }
    finally { setBusy(false); }
  }
  async function download(id: string) {
    setMessage('');
    try { const url = await downloadApplicationDocument(id, role); window.location.assign(url); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Téléchargement impossible.'); }
  }
  const selectedYear = state.academicYearContext?.years.find(year => year.id === state.academicYearContext?.selectedYearId);
  const yearLabel = selectedYear?.name || (state.academicYearSelection === 'all' ? 'toutes les années' : 'l’année consultée');
  const applications = data?.applications.filter(item => `${item.reference} ${item.identity.nom} ${item.identity.prenom} ${item.identity.email}`.toLocaleLowerCase('fr').includes(filter.trim().toLocaleLowerCase('fr'))) || [];
  const statusLabels = { BROUILLON: 'Brouillon', RECU: 'Reçu', EN_ANALYSE: 'En analyse', CLASSE: 'Classé' };
  return <><FormFeedback message={success} error={false} />{baseTask && <CatalogTaskDialog root={baseTask} onClose={() => setBaseTask(null)} onSaved={() => { setBaseTask(null); void loadWebsiteData<WebsiteManagement>('admissions', role).then(setData).catch(error => setMessage(error.message)); }} />}{!selected && !intake && <AdmissionsFrame title={mode === 'configuration' ? 'Formations et pièces' : 'Demandes en ligne'} onClose={onClose}>
    <p>{mode === 'configuration' ? 'Pièces obligatoires par niveau et filière pour l’année consultée.' : `Candidatures reçues pour ${yearLabel}.`}</p>
    {message && !selected && !intake && <p role="alert" className="auth-error">{message}</p>}
    <IconButton className="btn btn-outline mb-2" onClick={() => setRevision(value => value + 1)} label="Actualiser les dossiers" />
    {!data ? message ? <section className="card" role="alert"><p>Le chargement des demandes a échoué.</p><IconButton className="btn btn-outline" onClick={() => setRevision(value => value + 1)} label="Réessayer" /></section> : <LoadingState label="Chargement des demandes…" /> : <>
      {mode === 'applications' && <div className="card card-full"><div className="card-header"><h2>Dossiers reçus du site</h2><span className="pill pill-default">{data.applications.length} dossier(s)</span></div><div className="browser-toolbar"><label className="form-group">Rechercher un dossier<input className="input" type="search" value={filter} onChange={event => setFilter(event.target.value)} placeholder="Nom, email ou référence" /></label>{filter && <button type="button" className="btn btn-outline" onClick={() => setFilter('')}>Effacer la recherche</button>}</div>
        {!data.applications.length ? <div className="empty-state"><strong>Aucune demande pour {yearLabel}</strong><span>Les dossiers apparaissent ici après leur envoi final depuis le formulaire du site.</span>{canManage && <Link className="btn btn-outline" href="/site-web/documents">Vérifier les formations ouvertes</Link>}</div> : <div className="table-wrap"><ResponsiveTable className="data-table"><thead><tr><th>Candidat</th><th>Référence</th><th>Formation</th><th>Année</th><th>État</th><th>Actions</th></tr></thead><tbody>{applications.map(item => <tr key={item.id}><td><strong>{item.identity.prenom} {item.identity.nom}</strong><div className="cell-sub">{item.identity.email}</div></td><td>{item.reference}</td><td>{item.intake_label || 'Formation non renseignée'}</td><td>{(data.years || []).find(year => year.id === item.academic_year_id)?.name || 'Année à rattacher'}</td><td><span className={`pill ${item.status === 'RECU' ? 'pill-warning' : 'pill-default'}`}>{statusLabels[item.status]}</span></td><td><IconButton className="btn btn-outline" label="Ouvrir le dossier" onClick={() => { setSuccess(''); setSelected(item); setIntake(null); setReason(''); setStatus(item.status === 'BROUILLON' ? 'RECU' : item.status); setConfirm(false); }} /></td></tr>)}{!applications.length && <tr><td colSpan={6}>Aucun dossier ne correspond à votre recherche.</td></tr>}</tbody></ResponsiveTable></div>}
      </div>}
      {mode === 'configuration' && <div className="card"><div className="card-header"><h2>Formations proposées à l’inscription</h2></div><p>Les formations proviennent de la préparation annuelle. Configurez ici leur ouverture et les pièces demandées.</p><label className="form-group">Filtrer par niveau<select className="select-input" value={levelFilter} onChange={event => setLevelFilter(event.target.value)}><option value="">Tous les niveaux</option>{data.levels.filter(level => data.intakes.some(item => item.level_id === level.id)).map(level => <option key={level.id} value={level.id}>{level.name}</option>)}</select></label>{!data.intakes.length && <p>Aucune formation disponible pour cette année. Préparez les formations dans « Année scolaire ».</p>}{data.intakes.filter(item => !levelFilter || item.level_id === levelFilter).map(item => <div key={item.id} className="mb-2"><strong>{item.label}</strong><p>{(data.years || []).find(year => year.id === item.academic_year_id)?.name || 'Année à renseigner'} · {item.level_name} · {item.program_name} · {item.active ? 'Ouverte sur le site' : 'Fermée'}</p><p>Pièces obligatoires : {item.required_documents.length ? item.required_documents.map(key => DOCUMENT_LABELS[key] || key).join(', ') : 'Aucune'}</p>{canManage && <button className="btn btn-outline" onClick={() => { setSuccess(''); setIntake({ ...item, academic_year_id: item.academic_year_id || '' }); setSelected(null); setReason(''); setConfirm(false); }}>Configurer : {item.label}</button>}</div>)}</div>}
    </>}
    </AdmissionsFrame>}
    {selected && <WorkPage busy={busy} title={`Dossier ${selected.reference}`} onClose={() => { if (!busy) setSelected(null); }}><div className="card">{message && <p role="alert" className="auth-error">{message}</p>}<h2>{selected.identity.prenom} {selected.identity.nom}</h2><p>{selected.intake_label} · {selected.status}</p><h3>Identité et coordonnées</h3><dl>{Object.entries(selected.identity).filter(([, value]) => value).map(([key, value]) => <div key={key}><dt>{({ nom: 'Nom', prenom: 'Prénom', genre: 'Sexe', date_naissance: 'Date de naissance', lieu_naissance: 'Lieu de naissance', nationalite: 'Nationalité', email: 'Email', tel: 'Téléphone', tel2: 'Autre téléphone', tel3: 'Autre téléphone', nom_jeune_fille: 'Nom de naissance' } as Record<string, string>)[key] || key.replaceAll('_', ' ')}</dt><dd>{String(value)}</dd></div>)}</dl><h3>Diplôme déclaré</h3>{Object.entries(selected.diploma).filter(([, value]) => value).map(([key, value]) => <p key={key}>{key === 'type_diplome_id' ? 'Dernier diplôme' : key.replaceAll('_', ' ')} : {String(value)}</p>)}<h3>Parents ou tuteurs</h3>{selected.guardians.map((guardian, index) => <p key={index}>{guardian.prenom} {guardian.nom} · {guardian.tel} · {guardian.email}</p>)}<h3>Pièces reçues</h3>{selected.documents.map(doc => <p key={doc.id}>{DOCUMENT_LABELS[doc.document_key]} — {doc.filename} <button className="btn btn-outline btn-sm" onClick={() => void download(doc.id)}>Télécharger {doc.filename}</button></p>)}
      {canManage && <form onSubmit={event => { event.preventDefault(); setConfirm(true); }}><label className="form-group">Suivi du dossier<select aria-label="Suivi du dossier" className="select-input" value={status} onChange={event => { setStatus(event.target.value); setConfirm(false); }}><option value="RECU">Reçu</option><option value="EN_ANALYSE">En analyse</option><option value="CLASSE">Classé</option></select></label><label className="form-group">Motif du suivi<textarea aria-label="Motif du suivi" className="input" required minLength={3} maxLength={1000} value={reason} onChange={event => { setReason(event.target.value); setConfirm(false); }} /></label>{!confirm && <DrawerActions><button className="btn btn-primary" disabled={busy}>Relire le changement</button></DrawerActions>}{confirm && <div className="card mt-2"><p>Enregistrer le statut {status} pour {selected.reference} ? Ce suivi ne vaut pas admission.</p><DrawerActions><button type="button" className="btn btn-primary" disabled={busy} onClick={() => void save({ action: 'application-status', id: selected.id, version: selected.version, status })}>Confirmer le suivi</button></DrawerActions></div>}</form>}
    </div></WorkPage>}
    {intake && data && <WorkPage busy={busy} title="Configurer une formation sur le site" onClose={() => { if (!busy) setIntake(null); }}><form className="card" onSubmit={event => { event.preventDefault(); setConfirm(true); }}>{message && <p role="alert" className="auth-error">{message}</p>}
      <label className="form-group">Année universitaire<select aria-label="Année universitaire" className="select-input" required disabled={!!intake.id && !!intake.academic_year_id} value={intake.academic_year_id || ''} onChange={event => { setConfirm(false); setIntake({ ...intake, academic_year_id: event.target.value }); }}><option value="">Choisir une année</option>{(data.years || []).map(year => <option key={year.id} value={year.id}>{year.name} · {year.status}</option>)}</select></label>
      <label className="form-group">Libellé public<input className="input" required minLength={3} maxLength={200} value={intake.label} onChange={event => { setConfirm(false); setIntake({ ...intake, label: event.target.value }); }} /></label>
      <label className="form-group">Niveau<select aria-label="Niveau" className="select-input" required disabled={!!intake.id} value={intake.level_id} onChange={event => { setConfirm(false); setIntake({ ...intake, level_id: event.target.value }); }}><option value="">Choisir un niveau existant</option>{data.levels.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label className="form-group">Filière<select aria-label="Filière" className="select-input" required disabled={!!intake.id} value={intake.program_id} onChange={event => { setConfirm(false); setIntake({ ...intake, program_id: event.target.value }); }}><option value="">Choisir une filière existante</option>{data.programs.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      {canManage && state.perms.permissions.includes('academic.structure.manage') && <div className="btn-group">{!data.programs.length && <button type="button" className="btn btn-outline" onClick={() => setBaseTask('programs')}>Renseigner la filière ici</button>}{!data.levels.length && <button type="button" className="btn btn-outline" onClick={() => setBaseTask('levels')}>Renseigner le niveau ici</button>}</div>}
      <fieldset><legend>Pièces obligatoires pour cette formation</legend>{Object.entries(DOCUMENT_LABELS).map(([key, label]) => <label key={key} style={{ display: 'block', marginBottom: 8 }}><input type="checkbox" checked={intake.required_documents.includes(key)} onChange={event => { setConfirm(false); setIntake({ ...intake, required_documents: event.target.checked ? [...intake.required_documents, key] : intake.required_documents.filter(value => value !== key) }); }} /> {label}</label>)}</fieldset>
      <label className="form-group"><span><input type="checkbox" checked={intake.active} onChange={event => { setConfirm(false); setIntake({ ...intake, active: event.target.checked }); }} /> Ouvrir aux inscriptions sur le site</span></label>
      <label className="form-group">Motif de la configuration<textarea aria-label="Motif de la configuration" className="input" required minLength={3} maxLength={1000} value={reason} onChange={event => { setReason(event.target.value); setConfirm(false); }} /></label>{!confirm && <DrawerActions><button className="btn btn-primary" disabled={busy}>Relire la configuration</button></DrawerActions>}
      {confirm && <div className="card mt-2"><p>{intake.label} : {intake.active ? 'ouverte sur le site' : 'fermée'} ; {intake.required_documents.length} pièce(s) obligatoire(s).</p><DrawerActions><button type="button" className="btn btn-primary" disabled={busy} onClick={() => { const { id, version, academic_year_id, level_id, program_id, label, active, required_documents } = intake; void save({ action: 'intake-save', ...(id ? { id, version } : {}), academic_year_id, level_id, program_id, label, active, required_documents }); }}>Confirmer la configuration</button></DrawerActions></div>}
    </form></WorkPage>}
  </>;
}
