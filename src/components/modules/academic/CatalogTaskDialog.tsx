'use client';
import IconButton from '@/components/ui/IconButton';
import { useEffect, useState } from 'react';
import { usePortal } from '@/hooks/usePortal';
import { loadCatalog } from '@/services/remoteCampusService';
import { catalogSpec } from '@/services/catalogCrudService';
import { catalogTaskNeedsYear, catalogTaskOrder, type CatalogTask } from '@/services/catalogDependencyService';
import { CRUD_SECTIONS } from '@/data/crudCatalog';
import DetailDrawer from '@/components/ui/DetailDrawer';
import LoadingState from '@/components/ui/LoadingState';
import ReferenceCrudWorkspace from './ReferenceCrudWorkspace';

export default function CatalogTaskDialog({
  root,
  yearId: suppliedYear,
  yearName: suppliedName,
  category,
  stepKey,
  previousYear,
  previousSummary,
  prefilledItems,
  onClose,
  onSaved
}: {
  root: string;
  yearId?: string;
  yearName?: string;
  category?: string;
  stepKey?: string;
  previousYear?: { id: string; name: string };
  previousSummary?: import('@/services/yearPreparationService').ReconductConfigSummary;
  prefilledItems?: string[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const portal = usePortal();
  const [yearId, setYearId] = useState(suppliedYear || portal.academicYearContext?.selectedYearId || '');
  const [creatingYear, setCreatingYear] = useState(false);
  const [years, setYears] = useState<{id:string;name:string}[]>(() => (portal.academicYearContext?.years || []).filter(year => ['BROUILLON','OUVERTE'].includes(year.status)).map(year => ({ id: year.id, name: year.name })));
  const [yearsLoading, setYearsLoading] = useState(false);
  const [tasks, setTasks] = useState<CatalogTask[] | null>(null);
  const [error, setError] = useState(''); const [revision, setRevision] = useState(0); const [saved, setSaved] = useState<string[]>([]);
  const [rootSaved, setRootSaved] = useState(false);
  const needsYear = catalogTaskNeedsYear(root);
  useEffect(() => {
    const controller = new AbortController(); setTasks(null); setError('');
    if (needsYear && !yearId) {
      if (years.length) { setYearsLoading(false); return () => controller.abort(); }
      setYearsLoading(true);
      void loadCatalog('academic_years', portal.activeRole, controller.signal).then(data => { if (!controller.signal.aborted) setYears((data.tables.academic_years || []).filter(row => !row.archived_at && ['BROUILLON','OUVERTE'].includes(String(row.status))).map(row => ({ id: row.id, name: String(row.name) }))); }).catch(cause => { if (!controller.signal.aborted) setError(cause.message); }).finally(() => { if (!controller.signal.aborted) setYearsLoading(false); });
    } else {
      void catalogTaskOrder(root, key => loadCatalog(key, portal.activeRole, controller.signal, yearId)).then(order => { if (!controller.signal.aborted) setTasks(order); }).catch(cause => { if (!controller.signal.aborted) setError(cause.message); });
    }
    return () => controller.abort();
  }, [root, portal.activeRole, yearId, needsYear, revision, years.length]);
  const task = tasks?.[0];
  const section = task && Object.keys(CRUD_SECTIONS).find(key => CRUD_SECTIONS[key].includes(task.collection));
  const yearName = suppliedName || (needsYear ? portal.academicYearContext?.years.find(year => year.id === yearId)?.name || years.find(year => year.id === yearId)?.name || '' : '');
  if (creatingYear) return <CatalogTaskDialog root="academic_years" onClose={() => setCreatingYear(false)} onSaved={() => { setCreatingYear(false); void loadCatalog('academic_years', portal.activeRole).then(data => { const choices = (data.tables.academic_years || []).filter(row => !row.archived_at && ['BROUILLON','OUVERTE'].includes(String(row.status))).map(row => ({ id: row.id, name: String(row.name) })); const created = choices.filter(row => !years.some(year => year.id === row.id)); setYears(choices); if (created.length === 1) setYearId(created[0].id); }).catch(cause => setError(cause.message)); }} />;
  return <DetailDrawer title={`Préparer : ${catalogSpec(root).title}${yearName ? ` · ${yearName}` : ''}`} onClose={onClose}>
    {saved.length > 0 && <p role="status">{saved.at(-1)} : enregistré. L’étape suivante utilise ces informations.</p>}
    {error ? <section role="alert"><p>{error}</p><IconButton className="btn btn-outline" onClick={() => setRevision(value => value + 1)} label="Réessayer" /></section> : needsYear && !yearId && yearsLoading ? <LoadingState label="Chargement des années…" /> : needsYear && !yearId ? <><label className="form-group">Année de cette opération<select className="select-input" value={yearId} onChange={event => setYearId(event.target.value)}><option value="">Choisir une année</option>{years.map(year => <option key={year.id} value={year.id}>{year.name}</option>)}</select></label>{portal.perms.permissions.includes('academic.structure.manage') && <button className="btn btn-outline" onClick={() => setCreatingYear(true)}>Créer une année ici</button>}</> : !tasks ? <LoadingState label="Vérification de l’ordre des étapes…" /> : task && section ? <>
      <p>{task.collection === root ? root === 'academic_offerings' ? 'Choisissez les filières et niveaux à proposer cette année.' : 'Les informations nécessaires sont prêtes. Vous pouvez maintenant enregistrer votre opération.' : `Commencez par ${catalogSpec(task.collection).title.toLocaleLowerCase('fr')}. Les informations qui en dépendent viendront après l’enregistrement.`}</p>
      {tasks.length > 1 && <ol className="task-order" aria-label="Ordre des actions">{tasks.map((item, index) => <li key={item.collection} aria-current={index === 0 ? 'step' : undefined}>{catalogSpec(item.collection).title}</li>)}</ol>}
      <ReferenceCrudWorkspace
        key={`${task.collection}:${revision}`}
        section={section}
        setup={{
          collection: task.collection,
          yearId,
          yearName,
          category: task.collection === root ? category : undefined,
          createOnLoad: task.collection !== root || !rootSaved,
          stepKey: task.collection === root ? stepKey : undefined,
          previousYear: task.collection === root ? previousYear : undefined,
          previousSummary: task.collection === root ? previousSummary : undefined,
          prefilledItems: task.collection === root ? prefilledItems : undefined,
          onChoose: () => {},
          onDone: task.collection === root ? onClose : undefined,
          onSaved: () => {
            if (task.collection === root) {
              setRootSaved(true);
              onSaved();
            } else {
              setSaved(value => [...value, catalogSpec(task.collection).title]);
              setRevision(value => value + 1);
            }
          }
        }}
      />
    </> : null}
  </DetailDrawer>;
}
