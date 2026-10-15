'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { usePortal } from '@/hooks/usePortal';
import { CRUD_SECTIONS, HISTORY_CRUD_TABLES, HISTORY_CRUD_FIELDS, type CrudField } from '@/data/crudCatalog';
import { CATALOG_JOURNEYS } from '@/data/catalogJourneys';
import { catalogSpec, catalogLabel } from '@/services/catalogCrudService';
import { loadCatalog, mutateCatalog } from '@/services/remoteCampusService';
import type { HistoryRecord } from '@/types/history';
import type { DatabaseRow, CatalogSnapshot } from '@/types/persistence';
import ResponsiveTable from '@/components/ui/ResponsiveTable';
import WorkPage from '@/components/ui/WorkPage';
import ReviewedForm from '@/components/ui/ReviewedForm';
import ActionResult from '@/components/ui/ActionResult';
import { historyValue } from '@/services/historyDisplayService';

export default function ReferenceCrudWorkspace({ section }: { section: string }) {
  const portal = usePortal(); const { activeRole } = portal;
  const choices = CRUD_SECTIONS[section];
  const [collection, setCollection] = useState(choices[0]); const spec = catalogSpec(collection); const journey = CATALOG_JOURNEYS[collection];
  const [data, setData] = useState<CatalogSnapshot | null>(null); const [error, setError] = useState(''); const [retry, setRetry] = useState(0);
  const [query, setQuery] = useState(''); const [archived, setArchived] = useState(false); const [feedback, setFeedback] = useState('');
  const [dialog, setDialog] = useState<'create' | 'edit' | 'archive' | 'details' | null>(null); const [selected, setSelected] = useState<DatabaseRow | null>(null);
  const pendingResume = useRef<HistoryRecord | null>(null); const [sourceRowId, setSourceRowId] = useState<string | undefined>();
  const [form, setForm] = useState<Record<string, string>>({}); const [reason, setReason] = useState(''); const [saving, setSaving] = useState(false); const [saveError, setSaveError] = useState('');
  const canEdit = portal.globalAccess && portal.perms.permissions.includes(spec.write);
  useEffect(() => {
    const requested = new URL(window.location.href).searchParams.get('collection');
    if (requested && CRUD_SECTIONS[section].includes(requested)) setCollection(requested);
  }, [section]);
  useEffect(() => {
    const controller = new AbortController(); setData(null); setError(''); setDialog(null);
    void loadCatalog(collection, activeRole, controller.signal).then(result => {
      if (controller.signal.aborted) return;
      setData(result);
      const source = pendingResume.current;
      if (source) {
        setSelected(null); setSourceRowId(source.id); setDialog('create'); setReason('Reprise vérifiée du référentiel historique'); setSaveError('');
        setForm(Object.fromEntries(catalogSpec(collection).fields.map(field => [field.key, String(source.values[field.key === 'name' && collection === 'levels' ? 'libelle' : HISTORY_CRUD_FIELDS[field.key] || field.key] ?? '')])));
        pendingResume.current = null;
      }
    }).catch(cause => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Chargement impossible.'); });
    return () => controller.abort();
  }, [collection, activeRole, retry]);
  const sourceTable = Object.entries(HISTORY_CRUD_TABLES).find(([, target]) => target === collection)?.[0];
  const sources = portal.history.enabled && sourceTable ? (portal.history.catalog?.references[sourceTable] || []).filter(row => !data?.historyLinks?.some(link => link.sourceRowId === row.id)) : [];
  const sourceById = new Map(sources.map(source => [`source:${source.id}`, source]));
  const sourceRecords: DatabaseRow[] = sources.map(source => ({ id: `source:${source.id}`, ...Object.fromEntries(spec.fields.filter(field => !field.reference).map(field => [field.key, source.values[field.key === 'name' && collection === 'levels' ? 'libelle' : HISTORY_CRUD_FIELDS[field.key] || field.key]])) }));
  const display = (field: CrudField, row: DatabaseRow) => {
    const source = sourceById.get(row.id);
    if (source && field.reference) {
      const key = ({ academic_year_id: 'annee_scolaire_id', level_id: 'niveau_id' } as Record<string, string>)[field.key];
      return key && source.values[key] != null && portal.history.catalog ? historyValue(key, source.values[key], source, portal.history.catalog) : 'À compléter';
    }
    return field.type === 'select' ? field.options?.find(option => option.value === row[field.key])?.label || 'À compléter' : field.reference ? String(data?.tables[field.reference]?.find(ref => ref.id === row[field.key])?.name || 'Non renseigné') : row[field.key] == null || row[field.key] === '' ? 'À compléter' : String(row[field.key]);
  };
  const rows = [...(data?.tables[collection] || []).filter(row => Boolean(row.archived_at) === archived), ...(archived ? [] : sourceRecords)].filter(row => spec.fields.some(field => display(field, row).toLocaleLowerCase('fr').includes(query.toLocaleLowerCase('fr'))));
  const prerequisites = spec.fields.filter(field => field.reference && data && !(data.tables[field.reference] || []).some(row => !row.archived_at && row.active !== false));
  const choose = (key: string) => { pendingResume.current = null; setCollection(key); setQuery(''); setArchived(false); setFeedback(''); };
  const resume = (source: HistoryRecord) => { pendingResume.current = source; setRetry(value => value + 1); };
  const open = (mode: typeof dialog, row: DatabaseRow | null = null) => {
    setSourceRowId(undefined); setDialog(mode); setSelected(row); setSaveError(''); setReason(mode === 'create' ? `Création dans ${spec.title.toLocaleLowerCase('fr')}` : '');
    setForm(Object.fromEntries(spec.fields.map(field => [field.key, String(row?.[field.key] ?? '')])));
  };
  const nextCollection = journey?.next && choices.includes(journey.next) ? journey.next : undefined;
  return <div>
    <div className="page-intro"><div><span className="page-eyebrow">{section.startsWith('log_') ? 'ACHATS ET LOGISTIQUE' : 'GESTION ACADÉMIQUE'}</span><h1>{section === 'acad_program' ? 'Filières, parcours et matières' : section === 'acad_reference' ? 'Référentiel académique' : spec.title}</h1><p>{journey?.purpose}</p></div>{canEdit && <button className="btn btn-primary" disabled={!data || !!prerequisites.length} onClick={() => open('create')}>Ajouter {spec.singular}</button>}</div>
    {choices.length > 1 && <nav className="record-sections" aria-label="Référentiels">{choices.map(key => <button aria-pressed={collection === key} className={collection === key ? 'selected' : ''} key={key} onClick={() => choose(key)}>{catalogSpec(key).title}</button>)}</nav>}
    {feedback && <ActionResult title={feedback} nextLabel={nextCollection ? journey.nextLabel : undefined} onNext={nextCollection ? () => choose(nextCollection) : undefined} onDismiss={() => setFeedback('')}>{journey?.result}</ActionResult>}
    {canEdit && data && prerequisites.length > 0 && <section className="prerequisite-panel"><h2>À renseigner avant d’ajouter {spec.singular}</h2><p>Les références suivantes n’existent pas encore ou sont archivées.</p><div className="btn-group">{prerequisites.map(field => choices.includes(field.reference!) ? <button className="btn btn-outline" key={field.key} onClick={() => choose(field.reference!)}>Renseigner {catalogSpec(field.reference!).title.toLocaleLowerCase('fr')}</button> : portal.availableTabs.some(tab => tab.subTabs?.some(page => page.id === 'acad_reference')) ? <Link key={field.key} className="btn btn-outline" href={`/academique/referentiel?collection=${field.reference}`}>Renseigner {field.label.toLocaleLowerCase('fr')}</Link> : <span key={field.key}>{field.label} : à demander au responsable du référentiel.</span>)}</div></section>}
    {error ? <section className="card" role="alert"><p>{error}</p><button className="btn btn-outline" onClick={() => setRetry(value => value + 1)}>Réessayer</button></section> : !data ? <section className="card" role="status">Chargement du référentiel…</section> : <section className="card card-full"><div className="directory-toolbar"><label>Rechercher<input className="input" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder={`Nom ou code · ${spec.title.toLocaleLowerCase('fr')}`} /></label><label>Afficher<select className="select-input" value={archived ? 'archived' : 'active'} onChange={event => setArchived(event.target.value === 'archived')}><option value="active">Actuels et archives à compléter</option><option value="archived">Enregistrements archivés</option></select></label></div>
      <ResponsiveTable className="data-table"><thead><tr>{spec.fields.filter(field => field.type !== 'textarea').map(field => <th key={field.key}>{field.label}</th>)}<th>Actions</th></tr></thead><tbody>{rows.map(row => <tr key={row.id}>{spec.fields.filter(field => field.type !== 'textarea').map(field => <td key={field.key}>{display(field, row)}{field.key === 'name' && sourceById.has(row.id) && <div className="cell-sub">Archive à compléter avant utilisation</div>}</td>)}<td><div className="btn-group"><button className="btn btn-sm btn-outline" onClick={() => open('details', row)}>Voir</button>{canEdit && !row.archived_at && <>{sourceById.has(row.id) ? <button className="btn btn-sm btn-outline" onClick={() => resume(sourceById.get(row.id)!)}>Compléter l’archive</button> : <><button className="btn btn-sm btn-outline" onClick={() => open('edit', row)}>Modifier</button><button className="btn btn-sm btn-outline" onClick={() => open('archive', row)}>Archiver</button></>}</>}</div></td></tr>)}{!rows.length && <tr><td colSpan={spec.fields.filter(field => field.type !== 'textarea').length + 1}>{query ? 'Aucun résultat. Modifiez la recherche ou effacez-la pour retrouver la liste.' : archived ? 'Aucun enregistrement archivé.' : `Aucun enregistrement. ${canEdit && !prerequisites.length ? `Commencez par « Ajouter ${spec.singular} ».` : 'Les références nécessaires sont indiquées au-dessus.'}`}</td></tr>}</tbody></ResponsiveTable>
    </section>}
    {dialog && data && <WorkPage busy={saving} title={sourceRowId ? `Compléter ${spec.singular}` : dialog === 'create' ? `Ajouter ${spec.singular}` : dialog === 'edit' ? `Modifier : ${selected?.name}` : dialog === 'archive' ? `Archiver : ${selected?.name}` : String(selected?.name || 'Détail')} onClose={() => { if (!saving) setDialog(null); }}>
      {dialog === 'details' && selected ? <><dl className="record-details-grid">{spec.fields.map(field => <div key={field.key}><dt>{field.label}</dt><dd>{display(field, selected)}</dd></div>)}{selected.archived_at != null && <div><dt>Motif d’archivage</dt><dd>{String(selected.reason)}</dd></div>}</dl><p>{journey?.purpose}</p></> : <ReviewedForm key={`${collection}:${dialog}:${selected?.id || sourceRowId || ''}`} busy={saving} error={saveError} danger={dialog === 'archive'} confirmLabel={dialog === 'archive' ? 'Confirmer l’archivage' : 'Confirmer l’enregistrement'} fields={dialog === 'archive' ? [{ label: spec.title, value: String(selected?.name) }, { label: 'Motif', value: reason }] : [...spec.fields.map(field => ({ label: field.label, value: field.reference ? String(data.tables[field.reference]?.find(row => row.id === form[field.key])?.name || '') : field.type === 'select' ? field.options?.find(option => option.value === form[field.key])?.label || '' : form[field.key], ...(selected ? { previous: display(field, selected) } : {}) })), { label: 'Motif', value: reason }]} consequence={dialog === 'archive' ? 'L’enregistrement ne sera plus proposé pour de nouvelles affectations. Les relations existantes et les anciennes valeurs seront conservées ; le motif sera audité.' : `${journey?.result || ''}${sourceRowId ? ' L’archive originale restera conservée et liée au nouvel enregistrement.' : ''}`} onConfirm={() => {
        setSaving(true); setSaveError('');
        const values = Object.fromEntries(spec.fields.map(field => [field.key, field.type === 'number' ? Number(form[field.key]) : form[field.key]]));
        void mutateCatalog(collection, { revision: data.revision, reason, ...(dialog === 'archive' ? {} : { values }), ...(sourceRowId ? { sourceRowId } : {}) }, activeRole, selected?.id, dialog === 'archive').then(() => { setDialog(null); setFeedback(dialog === 'archive' ? `${selected?.name} : archivage enregistré` : `${form.name || spec.title} : enregistrement confirmé`); setRetry(value => value + 1); }).catch(cause => setSaveError(cause instanceof Error ? cause.message : 'Enregistrement impossible.')).finally(() => setSaving(false));
      }}><fieldset disabled={saving} className="permission-fieldset">
        {sourceRowId && <p>Complétez les champs officiels manquants. L’original restera conservé.</p>}
        {dialog === 'archive' ? <p>Indiquez le motif du retrait de {String(selected?.name)}. Vous vérifierez ses conséquences avant la confirmation.</p> : spec.fields.map(field => <label className="form-group" key={field.key}>{field.label}{field.type === 'reference' ? <select className="select-input" required value={form[field.key]} onChange={event => setForm({ ...form, [field.key]: event.target.value, ...(field.key === 'site_id' ? { building_id: '' } : {}) })}><option value="">Sélectionner</option>{(data.tables[field.reference!] || []).filter(row => !row.archived_at && row.active !== false && (field.reference !== 'buildings' || !form.site_id || row.site_id === form.site_id)).map(row => <option key={row.id} value={row.id}>{catalogLabel(field.reference!, row, data)}</option>)}</select> : field.type === 'select' ? <select className="select-input" required value={form[field.key]} onChange={event => setForm({ ...form, [field.key]: event.target.value })}><option value="">Sélectionner</option>{field.options!.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select> : field.type === 'textarea' ? <textarea className="input" value={form[field.key]} maxLength={4000} onChange={event => setForm({ ...form, [field.key]: event.target.value })} /> : <input className="input" required={field.required} type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : field.type === 'email' ? 'email' : 'text'} min={field.min} max={field.type === 'number' ? field.key === 'position' ? 32767 : 2147483647 : undefined} maxLength={160} value={form[field.key]} onChange={event => setForm({ ...form, [field.key]: event.target.value })} />}</label>)}
        <label className="form-group">Motif<textarea className="input" required minLength={3} maxLength={1000} value={reason} onChange={event => setReason(event.target.value)} /></label><button className="btn btn-primary">Vérifier les informations</button>
      </fieldset></ReviewedForm>}
    </WorkPage>}
  </div>;
}
