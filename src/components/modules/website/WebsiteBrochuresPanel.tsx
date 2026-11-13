'use client';
import PageHeader from '@/components/ui/PageHeader';
import SecondaryDetails from '@/components/ui/SecondaryDetails';
import DrawerActions from '@/components/ui/DrawerActions';
import { DrawerCloseButton } from '@/components/ui/DetailDrawer';
import ReviewedForm from '@/components/ui/ReviewedForm';
import { useEffect, useState } from 'react';
import { usePortal } from '@/hooks/usePortal';
import { loadWebsiteBrochures, loadWebsiteData, saveWebsiteBrochure } from '@/services/remoteCampusService';
import { BROCHURE_CYCLES, slugifyWebsiteText } from '@/services/websiteService';
import type { WebsiteBrochure, WebsiteProgramReference } from '@/types/website';
import LoadingState from '@/components/ui/LoadingState';
import ErrorState from '@/components/ui/ErrorState';
import WorkPage from '@/components/ui/WorkPage';
import FormFeedback from '@/components/ui/FormFeedback';

const empty = { title: '', slug: '', description: '', status: 'PUBLIE' as WebsiteBrochure['status'], program_id: null as string | null, cycle: null as WebsiteBrochure['cycle'] };
const labels = { BROUILLON: 'Brouillon', PUBLIE: 'Publiée', RETIRE: 'Retirée' };
const cycleLabels: Record<string, string> = { LICENCE: 'Licence Pro', MASTER: 'Master Pro', EXECUTIVE: 'Executive Master' };
const cycles = ['LICENCE', 'MASTER', 'EXECUTIVE', 'GENERAL'];

function buildSuggestedBrochureTitle(cycle: WebsiteBrochure['cycle'], programId: string | null, programs: WebsiteProgramReference[]): string {
  const program = programs.find(item => item.id === programId);
  const cycleTitle = cycle ? BROCHURE_CYCLES[cycle] : '';
  if (cycleTitle && program) return `${cycleTitle} en ${program.name}`;
  if (program) return `Brochure ${program.name}`;
  if (cycleTitle) return `Brochure ${cycleTitle}`;
  return '';
}

export default function WebsiteBrochuresPanel({ onBack }: { onBack?: () => void }) {
  const state = usePortal();
  const role = state.activeRole;
  const year = state.academicYearContext?.selectedYearId;
  const canManage = !!year && state.perms.permissions.includes('communication.manage') && !!state.session?.capabilities?.[role]?.globalAccess;
  const [rows, setRows] = useState<WebsiteBrochure[]>([]);
  const [editing, setEditing] = useState<(typeof empty & Partial<WebsiteBrochure>) | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const [programs, setPrograms] = useState<WebsiteProgramReference[]>([]);
  const [programsLoading, setProgramsLoading] = useState(true);
  const [programsError, setProgramsError] = useState('');
  const [programsRevision, setProgramsRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(''); setEditing(null);
    loadWebsiteBrochures(role, controller.signal).then(data => { if (!controller.signal.aborted) setRows(data); })
      .catch(cause => { if (!controller.signal.aborted) setError(cause.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });

    return () => controller.abort();
  }, [role, year, revision]);

  useEffect(() => {
    const controller = new AbortController();
    setPrograms([]); setProgramsError(''); setProgramsLoading(canManage);
    if (canManage) void loadWebsiteData<{ programs: WebsiteProgramReference[] }>('brochure-programs', role, controller.signal)
      .then(data => { if (!controller.signal.aborted) setPrograms(data.programs); })
      .catch(cause => { if (!controller.signal.aborted) setProgramsError(cause instanceof Error ? cause.message : 'Chargement des filières impossible.'); })
      .finally(() => { if (!controller.signal.aborted) setProgramsLoading(false); });
    return () => controller.abort();
  }, [role, year, canManage, programsRevision]);

  function edit(row: typeof editing) { setEditing(row); setFile(null); setSaveError(''); setSuccess(''); }

  async function save() {
    if (!editing || busy) return;
    setBusy(true); setSaveError('');
    const { id, version, title, slug, description, status, program_id, cycle } = editing;
    const computedSlug = slugifyWebsiteText(slug || title) || 'brochure-escen';
    try {
      await saveWebsiteBrochure({
        ...(id ? { id, version } : {}),
        title,
        slug: computedSlug,
        description,
        status,
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

  const original = editing?.id ? rows.find(row => row.id === editing.id) : undefined;

  return <section>
    <FormFeedback message={success} error={false} />
    <PageHeader
      eyebrow="COMMUNICATION & SITE WEB"
      title="Brochures du site"
      description="Documents PDF officiels téléchargeables par filière et cycle d’études sur le site public."
    >
      {onBack && <button className="btn btn-outline" onClick={onBack}>Articles du site</button>}
      {canManage && <button className="btn btn-primary" onClick={() => edit({ ...empty })}>+ Ajouter une brochure</button>}
    </PageHeader>
    {loading ? <LoadingState label="Chargement des brochures…" variant="cards" /> : error ? <ErrorState title="Brochures indisponibles" message={error} onRetry={() => setRevision(value => value + 1)} /> : <div className="brochure-catalogue">{!rows.length && <p className="card">Aucune brochure pour cette année.</p>}{cycles.map(cycle => {
      const documents = rows.filter(row => (row.cycle || 'GENERAL') === cycle).sort((a, b) => (a.program_name || a.title).localeCompare(b.program_name || b.title, 'fr'));
      if (!documents.length) return null;
      return <section className="card brochure-cycle" key={cycle} aria-label={cycleLabels[cycle] || 'Brochures générales'}>
        <div className="brochure-cycle-heading"><h2>{cycleLabels[cycle] || 'Brochures générales'}</h2><span className="cell-sub">{documents.length} {documents.length > 1 ? 'brochures' : 'brochure'}</span></div>
        {documents.map(row => <article className="brochure-document" key={row.id}>
          <div className="brochure-document-body">
            <h3>{row.program_name || row.title}</h3>
            <div className="brochure-document-meta"><span className={`pill ${row.status === 'PUBLIE' ? 'pill-success' : row.status === 'BROUILLON' ? 'pill-warning' : 'pill-default'}`}>{labels[row.status]}</span><span>PDF · {row.byte_size < 1024 * 1024 ? `${Math.max(1, Math.round(row.byte_size / 1024)).toLocaleString('fr-FR')} Ko` : `${(row.byte_size / 1024 / 1024).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} Mo`}</span></div>
            <SecondaryDetails className="brochure-document-details" title="Détails du document"><p>{row.title}</p>{row.description && <p>{row.description}</p>}<p className="cell-sub">{row.filename}</p></SecondaryDetails>
          </div>
          {canManage && <button className="btn btn-outline brochure-edit-action" aria-label={`Modifier : ${row.title}`} onClick={() => edit(row)}>Modifier</button>}
        </article>)}
      </section>;
    })}</div>}
    {editing && <WorkPage busy={busy} title={editing.id ? 'Modifier la brochure' : 'Ajouter une brochure'} onClose={() => { if (!busy) setEditing(null); }}>
      <ReviewedForm className="brochure-editor" busy={busy} error={saveError}
        confirmLabel="Confirmer l’enregistrement"
        validate={() => programsLoading ? 'Attendez le chargement des filières.' : programsError || (!editing.id && !file ? 'Choisissez le PDF de la brochure.' : null)}
        fields={[
          { label: 'Titre', value: editing.title, previous: original?.title },
          { label: 'Cycle', value: editing.cycle ? BROCHURE_CYCLES[editing.cycle] : 'Brochure générale', previous: original ? (original.cycle ? BROCHURE_CYCLES[original.cycle] : 'Brochure générale') : undefined },
          { label: 'Filière', value: programs.find(program => program.id === editing.program_id)?.name || (editing.program_id ? editing.program_name || 'Filière actuelle' : 'Toutes les filières'), previous: editing.id ? original?.program_name || 'Toutes les filières' : undefined },
          { label: 'Description', value: editing.description, previous: original?.description },
          { label: 'Document PDF', value: file?.name || editing.filename || '', previous: editing.id ? editing.filename : undefined },
          { label: 'Diffusion', value: labels[editing.status], previous: original ? labels[original.status] : undefined },
        ]}
        consequence={editing.status === 'PUBLIE' ? 'Cette brochure sera téléchargeable sur le site public lorsque l’année consultée est l’année de travail. Le nouveau PDF remplacera le document actuel si vous en avez choisi un.' : editing.status === 'RETIRE' ? 'La brochure ne sera plus téléchargeable sur le site public. Son historique sera conservé.' : 'Cette brochure restera privée et ne sera pas proposée au téléchargement sur le site public.'}
        onConfirm={() => void save()}>
        <p className="brochure-editor-intro">{editing.id ? 'Mettez à jour la présentation ou remplacez le PDF. Sans nouveau fichier, le document actuel est conservé.' : 'Associez un PDF à une formation, puis choisissez sa visibilité sur le site.'}</p>
        {programsLoading && <LoadingState label="Chargement des filières…" />}
        {programsError && <div role="alert"><p>{programsError}</p><button type="button" className="btn btn-outline" onClick={() => setProgramsRevision(value => value + 1)}>Réessayer les filières</button></div>}
        <fieldset className="brochure-editor-section" disabled={busy}>
          <legend>1. Formation et présentation</legend>
          <div className="brochure-fields">
            <label className="form-group">Cycle d&apos;études<select className="select-input" value={editing.cycle || ''} onChange={event => {
              const nextCycle = (event.target.value || null) as WebsiteBrochure['cycle'];
              const prevSuggested = buildSuggestedBrochureTitle(editing.cycle || null, editing.program_id || null, programs);
              const nextSuggested = buildSuggestedBrochureTitle(nextCycle, editing.program_id || null, programs);
              const nextTitle = (!editing.title || editing.title === prevSuggested) && nextSuggested ? nextSuggested : editing.title;
              setEditing({ ...editing, cycle: nextCycle, title: nextTitle, slug: editing.id ? editing.slug : slugifyWebsiteText(nextTitle) });
            }}><option value="">Aucun (Brochure générale)</option><option value="LICENCE">Licence professionnelle</option><option value="MASTER">Master professionnel</option><option value="EXECUTIVE">Executive Master</option></select></label>
            <label className="form-group">Filière associée (facultatif)<select className="select-input" disabled={programsLoading || !!programsError} value={editing.program_id || ''} onChange={event => {
              const nextProgramId = event.target.value || null;
              const prevSuggested = buildSuggestedBrochureTitle(editing.cycle || null, editing.program_id || null, programs);
              const nextSuggested = buildSuggestedBrochureTitle(editing.cycle || null, nextProgramId, programs);
              const nextTitle = (!editing.title || editing.title === prevSuggested) && nextSuggested ? nextSuggested : editing.title;
              setEditing({ ...editing, program_id: nextProgramId, title: nextTitle, slug: editing.id ? editing.slug : slugifyWebsiteText(nextTitle) });
            }}><option value="">Aucune (Brochure générale)</option>{editing.program_id && !programs.some(program => program.id === editing.program_id) && <option value={editing.program_id}>{editing.program_name || 'Filière actuelle indisponible'}</option>}{programs.map(p => <option key={p.id} value={p.id}>{p.name}{p.code ? ` (${p.code})` : ''}</option>)}</select></label>
          </div>
          <label className="form-group">Titre<input className="input" required minLength={3} maxLength={180} placeholder="Ex : Licence professionnelle en Finance Digitale" value={editing.title} onChange={event => {
            const nextTitle = event.target.value;
            setEditing({ ...editing, title: nextTitle, slug: editing.id ? editing.slug : slugifyWebsiteText(nextTitle) });
          }} /></label>
          {(editing.slug || editing.title) && (
            <div className="editorial-slug-hint">
              <span>Référence de la brochure</span>
              <code>/brochures/{editing.slug || slugifyWebsiteText(editing.title)}</code>
            </div>
          )}
          <label className="form-group">Description<textarea className="input" maxLength={500} placeholder="Présentation succincte des débouchés et du contenu de la brochure…" value={editing.description} onChange={event => setEditing({ ...editing, description: event.target.value })} /></label>
        </fieldset>
        <fieldset className="brochure-editor-section" disabled={busy}>
          <legend>2. Document PDF</legend>
          {editing.filename && <div className="brochure-current-file"><span className="cell-sub">Document actuel</span><strong>{editing.filename}</strong><span>{file ? "Il sera remplacé après confirmation." : "Il sera conservé si vous ne choisissez pas de nouveau PDF."}</span></div>}
          <label className="form-group">Fichier PDF — 10 Mo maximum<input className="input" type="file" accept="application/pdf,.pdf" required={!editing.id} onChange={event => {
            const selected = event.target.files?.[0] || null;
            if (selected && (selected.size > 10 * 1024 * 1024 || !selected.name.toLowerCase().endsWith('.pdf') || (selected.type && selected.type !== 'application/pdf'))) {
              setSaveError(selected.size > 10 * 1024 * 1024 ? 'Le PDF doit faire au maximum 10 Mo.' : 'Choisissez un fichier PDF valide.');
              event.target.value = ''; setFile(null); return;
            }
            setSaveError(''); setFile(selected);
          }} /></label>
          {file && <p className="brochure-selected-file" role="status">Nouveau PDF : <strong>{file.name}</strong> · {(file.size / 1024 / 1024).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} Mo</p>}
          {saveError && <p role="alert" className="auth-error">{saveError}</p>}
        </fieldset>
        <fieldset className="brochure-editor-section" disabled={busy}>
          <legend>3. Diffusion sur le site</legend>
          <label className="form-group">Diffusion<select className="select-input" value={editing.status} onChange={event => setEditing({ ...editing, status: event.target.value as WebsiteBrochure['status'] })}><option value="BROUILLON">Brouillon privé</option><option value="PUBLIE">Publier sur le site</option><option value="RETIRE">Retirer du site</option></select></label>
          <p className="cell-sub">{editing.status === 'PUBLIE' ? 'Accessible aux visiteurs du site pour l’année de travail.' : editing.status === 'BROUILLON' ? 'Visible uniquement dans cet espace de gestion.' : 'Retirée du catalogue public, avec conservation de son historique.'}</p>
        </fieldset>
        <DrawerActions><DrawerCloseButton className="btn btn-outline">Annuler</DrawerCloseButton><button className="btn btn-primary" disabled={programsLoading || !!programsError}>Vérifier la brochure</button></DrawerActions>
      </ReviewedForm>
    </WorkPage>}
  </section>;
}
