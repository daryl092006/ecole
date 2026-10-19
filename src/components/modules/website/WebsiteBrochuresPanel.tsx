'use client';
import DrawerActions from '@/components/ui/DrawerActions';
import { useEffect, useState } from 'react';
import { usePortal } from '@/hooks/usePortal';
import { loadWebsiteBrochures, loadWebsiteData, saveWebsiteBrochure } from '@/services/remoteCampusService';
import type { WebsiteBrochure } from '@/types/website';
import LoadingState from '@/components/ui/LoadingState';
import WorkPage from '@/components/ui/WorkPage';
import FormFeedback from '@/components/ui/FormFeedback';

const empty = { title: '', slug: '', description: '', status: 'BROUILLON' as WebsiteBrochure['status'], program_id: null as string | null, cycle: null as WebsiteBrochure['cycle'] };
const labels = { BROUILLON: 'Brouillon', PUBLIE: 'Publiée', RETIRE: 'Retirée' };
const cycleLabels: Record<string, string> = { LICENCE: 'Licence Pro', MASTER: 'Master Pro', EXECUTIVE: 'Executive Master' };

export default function WebsiteBrochuresPanel({ onBack }: { onBack?: () => void }) {
  const state = usePortal();
  const role = state.activeRole;
  const year = state.academicYearContext?.selectedYearId;
  const canManage = !!year && state.perms.permissions.includes('communication.manage') && state.session?.capabilities?.[role]?.globalAccess;
  const [rows, setRows] = useState<WebsiteBrochure[]>([]);
  const [editing, setEditing] = useState<(typeof empty & Partial<WebsiteBrochure>) | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [revision, setRevision] = useState(0);
  const [programs, setPrograms] = useState<{ id: string; name: string; code?: string }[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(''); setEditing(null);
    loadWebsiteBrochures(role, controller.signal).then(data => { if (!controller.signal.aborted) setRows(data); })
      .catch(cause => { if (!controller.signal.aborted) setError(cause.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });

    loadWebsiteData<{ programs: { id: string; name: string }[] }>('admissions', role, controller.signal)
      .then(res => { if (!controller.signal.aborted && res?.programs) setPrograms(res.programs); })
      .catch(() => {});

    return () => controller.abort();
  }, [role, year, revision]);

  function edit(row: typeof editing) { setEditing(row); setFile(null); setConfirm(false); setSaveError(''); setSuccess(''); }

  async function save() {
    if (!editing) return;
    setBusy(true); setSaveError('');
    const { id, version, title, slug, description, status, program_id, cycle } = editing;
    try {
      await saveWebsiteBrochure({
        ...(id ? { id, version } : {}),
        title, slug, description, status,
        program_id: program_id || null,
        cycle: cycle || null,
        reason: `${labels[status]} : ${title}`
      }, file, role);
      setEditing(null); setRevision(value => value + 1);
      setSuccess(status === 'RETIRE' ? 'Brochure retirée du site. Son historique est conservé.' : 'Brochure enregistrée.');
      state.refreshCampus();
    } catch (cause) { setSaveError(cause instanceof Error ? cause.message : 'Enregistrement impossible.'); }
    finally { setBusy(false); }
  }

  return <section>
    <FormFeedback message={success} error={false} />
    <div className="module-header"><div><h1>Brochures du site</h1><p>Documents PDF à télécharger par filière et cycle</p></div><div className="btn-group">{onBack && <button className="btn btn-outline" onClick={onBack}>Articles du site</button>}{canManage && <button className="btn btn-primary" onClick={() => edit({ ...empty })}>Ajouter une brochure</button>}</div></div>
    {loading ? <LoadingState label="Chargement des brochures…" /> : error ? <div className="card" role="alert"><p>{error}</p><button className="btn btn-outline" onClick={() => setRevision(value => value + 1)}>Réessayer</button></div> : <div className="card">{!rows.length && <p>Aucune brochure pour cette année.</p>}{rows.map(row => <article className="card mb-2" key={row.id}>
      <div className="brochure-card-header">
        <div>
          <h2>{row.title}</h2>
          <p className="brochure-context">
            {row.cycle ? (cycleLabels[row.cycle] || row.cycle) : 'Générale'}
            {row.program_name ? ` · ${row.program_name}` : ''}
          </p>
          <p>{row.description}</p>
          <p className="cell-sub">{labels[row.status]} · {row.filename} · {(row.byte_size / 1024 / 1024).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} Mo</p>
        </div>
        {canManage && <button className="btn btn-outline brochure-edit-action" onClick={() => edit(row)}>Modifier : {row.title}</button>}
      </div>
    </article>)}</div>}
    {editing && <WorkPage busy={busy} title={editing.id ? 'Modifier la brochure' : 'Ajouter une brochure'} onClose={() => { if (!busy) setEditing(null); }}>
      <form className="card" onSubmit={event => { event.preventDefault(); setConfirm(true); }}>
        <fieldset disabled={busy || confirm}>
          <label className="form-group">Titre<input className="input" required minLength={3} maxLength={180} value={editing.title} onChange={event => setEditing({ ...editing, title: event.target.value })} /></label>
          <label className="form-group">Adresse de la brochure (slug)<input className="input" required pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={180} value={editing.slug} onChange={event => setEditing({ ...editing, slug: event.target.value })} /></label>
          <div className="brochure-fields">
            <label className="form-group">Filière associée (facultatif)<select className="select-input" value={editing.program_id || ''} onChange={event => setEditing({ ...editing, program_id: event.target.value || null })}><option value="">Aucune (Brochure générale)</option>{programs.map(p => <option key={p.id} value={p.id}>{p.name} ({p.code})</option>)}</select></label>
            <label className="form-group">Cycle d'études<select className="select-input" value={editing.cycle || ''} onChange={event => setEditing({ ...editing, cycle: (event.target.value || null) as WebsiteBrochure['cycle'] })}><option value="">Aucun</option><option value="LICENCE">Licence professionnelle</option><option value="MASTER">Master professionnel</option><option value="EXECUTIVE">Executive Master</option></select></label>
          </div>
          <label className="form-group">Description<textarea className="input" maxLength={500} value={editing.description} onChange={event => setEditing({ ...editing, description: event.target.value })} /></label>
          <label className="form-group">Fichier PDF — 10 Mo maximum<input className="input" type="file" accept="application/pdf,.pdf" required={!editing.id} onChange={event => setFile(event.target.files?.[0] || null)} /></label>
          {editing.filename && <p>Fichier actuel : {editing.filename}</p>}
          <label className="form-group">Diffusion<select className="select-input" value={editing.status} onChange={event => setEditing({ ...editing, status: event.target.value as WebsiteBrochure['status'] })}><option value="BROUILLON">Brouillon privé</option><option value="PUBLIE">Publier sur le site</option><option value="RETIRE">Retirer du site</option></select></label>
          {!confirm && <DrawerActions><button className="btn btn-primary">Vérifier la brochure</button></DrawerActions>}
        </fieldset>
        {saveError && <p role="alert" className="auth-error">{saveError}</p>}
        {confirm && <div className="card" role="region" aria-label="Confirmation de la brochure"><h2>{editing.title}</h2><p>{file?.name || editing.filename}</p><p>{editing.status === 'PUBLIE' ? 'Visible sur le site lorsque cette année est l’année de travail.' : editing.status === 'RETIRE' ? 'Le téléchargement sera retiré du site.' : 'Le PDF restera privé.'}</p><DrawerActions><button type="button" className="btn btn-primary" disabled={busy} onClick={() => void save()}>{busy ? 'Enregistrement…' : 'Confirmer l’enregistrement'}</button><button type="button" className="btn btn-outline" disabled={busy} onClick={() => setConfirm(false)}>Modifier</button></DrawerActions></div>}
      </form>
    </WorkPage>}
  </section>;
}
