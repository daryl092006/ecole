'use client';
import DrawerActions from '@/components/ui/DrawerActions';
import IconButton from '@/components/ui/IconButton';
import LoadingState from '@/components/ui/LoadingState';
import CatalogTaskDialog from './CatalogTaskDialog';
import AnnualOfferingList from './AnnualOfferingList';
import { annualOfferingLabel, annualOfferingProposals, groupAnnualOfferings, offeringVariantKey, type AnnualOfferingGroup, type AnnualOfferingVariant } from '@/services/annualOfferingService';
import { useSearchParams } from 'next/navigation';
import { YEAR_STATUS_LABELS, type YearStatus } from '@/types/academicYearContext';
import AcademicYearLifecycle from './AcademicYearLifecycle';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { usePortal } from '@/hooks/usePortal';
import { CRUD_SECTIONS, HISTORY_CRUD_TABLES, HISTORY_CRUD_FIELDS, type CrudField } from '@/data/crudCatalog';
import { CATALOG_JOURNEYS } from '@/data/catalogJourneys';
import { catalogSpec, catalogLabel } from '@/services/catalogCrudService';
import { loadCatalog, mutateCatalog, loadYearPreparation, reconductYearPreparation } from '@/services/remoteCampusService';
import type { HistoryRecord } from '@/types/history';
import type { DatabaseRow, CatalogSnapshot } from '@/types/persistence';
import ResponsiveTable from '@/components/ui/ResponsiveTable';
import WorkPage from '@/components/ui/WorkPage';
import { DrawerCloseButton, useDrawer } from '@/components/ui/DetailDrawer';
import ReviewedForm from '@/components/ui/ReviewedForm';
import ActionResult from '@/components/ui/ActionResult';
import { historyValue } from '@/services/historyDisplayService';
import { displayLabel } from '@/utils/display';

import { suggestNextAcademicYear, getStepPreFilledItems, groupOfferingSelection, collectionToStep, type ReconductConfigSummary } from '@/services/yearPreparationService';

function InlineSubView({
  title,
  onClose,
  children,
  busy = false,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  busy?: boolean;
}) {
  return (
    <div className="inline-subview">
      <header className="inline-subview-header">
        <DrawerCloseButton
          type="button"
          className="btn btn-sm btn-outline"
          disabled={busy}
          onClose={onClose}
        >
          ← Retour à la liste
        </DrawerCloseButton>
        <h2>{title}</h2>
      </header>
      <div>{children}</div>
    </div>
  );
}

function buildPrefilledRows({
  collection,
  category,
  targetYearId,
  summary,
  items,
}: {
  collection: string;
  category?: string;
  targetYearId: string;
  summary: ReconductConfigSummary | null | undefined;
  items: string[];
}): DatabaseRow[] {
  if (collection === 'academic_offerings') {
    const rawList = summary?.rawOfferings;
    if (rawList && rawList.length > 0) {
      return rawList.map((raw, idx) => {
        const itemText = summary?.offerings?.[idx] || '';
        const parts = itemText ? itemText.split(' · ') : [];
        return {
          ...raw,
          id: `prefilled:${raw.id || idx}`,
          isPrefilled: true,
          academic_year_id: targetYearId,
          _programName: raw._programName || parts[0] || 'Formation',
          _curriculumName: raw._curriculumName || parts[0] || 'Programme de formation',
          _levelName: raw._levelName || parts[1] || '',
          delivery_mode: raw.delivery_mode || null,
          _summaryText: itemText || `${raw._programName || 'Formation'} · ${raw._levelName || ''}`,
        };
      });
    }
    return items.map((itemText, idx) => {
      const parts = itemText.split(' · ');
      return {
        id: `prefilled:offering:${idx}`,
        isPrefilled: true,
        academic_year_id: targetYearId,
        curriculum_id: '',
        level_id: '',
        delivery_mode: parts[2] || 'Présentiel',
        name: parts[0] || itemText,
        _programName: parts[0] || itemText,
        _curriculumName: parts[0] || itemText,
        _levelName: parts[1] || '',
        _summaryText: itemText,
      };
    });
  }

  if (collection === 'groups') {
    const rawList = summary?.rawGroups;
    if (rawList && rawList.length > 0) {
      return rawList.map((raw, idx) => ({
        ...raw,
        id: `prefilled:${raw.id || idx}`,
        isPrefilled: true,
        academic_year_id: targetYearId,
        _associatedOfferings: raw._associatedOfferings || '',
        _linkedOfferings: raw._linkedOfferings || [],
        _summaryText: summary?.groups?.[idx] || raw.name,
      }));
    }
    return items.map((itemText, idx) => ({
      id: `prefilled:group:${idx}`,
      isPrefilled: true,
      academic_year_id: targetYearId,
      name: itemText.split(' (')[0] || itemText,
      _summaryText: itemText,
    }));
  }

  if (collection === 'annual_fee_schedules') {
    const rawList = (summary?.rawFees || []).filter(f => !category || f.category === category);
    if (rawList && rawList.length > 0) {
      return rawList.map((raw, idx) => ({
        ...raw,
        id: `prefilled:${raw.id || idx}`,
        isPrefilled: true,
        academic_year_id: targetYearId,
        _summaryText: (category === 'INSCRIPTION' ? summary?.registrationFees : summary?.tuitionFees)?.[idx] || `${raw.amount} FCFA`,
      }));
    }
    return items.map((itemText, idx) => ({
      id: `prefilled:fee:${idx}`,
      isPrefilled: true,
      academic_year_id: targetYearId,
      category: category || 'SCOLARITE',
      amount: itemText.match(/(\d[\d\s]*)\s*FCFA/)?.[1]?.replace(/\s/g, '') || '0',
      _summaryText: itemText,
    }));
  }

  if (collection === 'annual_payment_channels') {
    const rawList = summary?.rawChannels;
    if (rawList && rawList.length > 0) {
      return rawList.map((raw, idx) => ({
        ...raw,
        id: `prefilled:${raw.id || idx}`,
        isPrefilled: true,
        academic_year_id: targetYearId,
        _summaryText: summary?.paymentChannels?.[idx] || raw.name,
      }));
    }
    return items.map((itemText, idx) => ({
      id: `prefilled:channel:${idx}`,
      isPrefilled: true,
      academic_year_id: targetYearId,
      name: itemText.split(' (')[0] || itemText,
      method: itemText.match(/\(([^)]+)\)/)?.[1] || 'ESPECES',
      _summaryText: itemText,
    }));
  }

  return [];
}

function getStepTitle(stepKey: string | null | undefined, collection: string, category?: string): string {
  if (stepKey === 'offerings' || collection === 'academic_offerings') return 'Formations proposées';
  if (stepKey === 'groups' || collection === 'groups') return 'Groupes';
  if (stepKey === 'tuition' || (collection === 'annual_fee_schedules' && category === 'SCOLARITE')) return 'Frais de scolarité';
  if (stepKey === 'registration' || (collection === 'annual_fee_schedules' && category === 'INSCRIPTION')) return 'Frais d’inscription';
  if (stepKey === 'payments' || collection === 'annual_payment_channels') return 'Encaissement';
  return catalogSpec(collection).title;
}

function emptyReferenceLabel(field: CrudField): string {
  if (field.key === 'program_id') return 'Toutes les filières';
  if (field.key === 'level_id') return 'Tous les niveaux';
  return 'Non renseigné';
}

function feeAmount(value: unknown): string {
  return value == null || value === '' ? 'À compléter' : `${Number(value).toLocaleString('fr-FR')} FCFA`;
}

function feeScopeKey(row: DatabaseRow): string {
  return JSON.stringify([row.academic_year_id, row.category, row.program_id || null, row.level_id || null, row.delivery_mode || null]);
}

function paymentChannelKey(row: DatabaseRow): string {
  return JSON.stringify([row.academic_year_id, row.method, String(row.name || '').trim()]);
}

function initialValues(fields: CrudField[], data: CatalogSnapshot | null, yearId: string, category?: string, row: DatabaseRow | null = null, collection?: string): Record<string, string> {
  let suggested: ReturnType<typeof suggestNextAcademicYear> | null = null;
  if (collection === 'academic_years' && !row && data?.tables.academic_years) {
    suggested = suggestNextAcademicYear(data.tables.academic_years);
  }
  return Object.fromEntries(fields.map(field => {
    const references = field.reference ? (data?.tables[field.reference] || []).filter(item => !item.archived_at && item.active !== false) : [];
    if (suggested && !row) {
      if (field.key === 'code') return [field.key, suggested.code];
      if (field.key === 'name') return [field.key, suggested.name];
      if (field.key === 'starts_on') return [field.key, suggested.starts_on];
      if (field.key === 'ends_on') return [field.key, suggested.ends_on];
    }
    return [field.key, String(row?.[field.key] ?? (field.key === 'academic_year_id' ? yearId : field.key === 'category' ? category || '' : field.key === 'version' ? '1' : field.required !== false && references.length === 1 ? references[0].id : ''))];
  }));
}

function completeRelations(collection: string, data: CatalogSnapshot | null, values: Record<string, string>) {
  const result = { ...values };
  const curriculum = data?.tables.curricula?.find(row => row.id === result.curriculum_id);
  const group = data?.tables.groups?.find(row => row.id === result.group_id);
  if (collection === 'academic_offerings' && curriculum?.level_id) result.level_id = String(curriculum.level_id);
  if (collection === 'group_offerings' && group) {
    if (group.level_id) result.level_id = String(group.level_id);
  }
  return result;
}

export default function ReferenceCrudWorkspace(props: {
  section: string;
  setup?: {
    yearId: string;
    yearName: string;
    collection: string;
    category?: string;
    createOnLoad?: boolean;
    editId?: string;
    onCancel?: () => void;
    onDone?: () => void;
    stepKey?: string;
    previousYear?: { id: string; name: string };
    previousSummary?: ReconductConfigSummary;
    prefilledItems?: string[];
    onSaved: (id?: string) => void;
    onChoose: (collection: string) => void;
  };
}) {
  const setup = props.setup?.collection === 'group_offerings' ? { ...props.setup, collection: 'groups', createOnLoad: false } : props.setup;
  return <ReferenceCrudContent {...props} setup={setup} />;
}

function ReferenceCrudContent({
  section,
  setup
}: {
  section: string;
  setup?: {
    yearId: string;
    yearName: string;
    collection: string;
    category?: string;
    createOnLoad?: boolean;
    editId?: string;
    onCancel?: () => void;
    onDone?: () => void;
    stepKey?: string;
    previousYear?: { id: string; name: string };
    previousSummary?: ReconductConfigSummary;
    prefilledItems?: string[];
    onSaved: (id?: string) => void;
    onChoose: (collection: string) => void;
  };
}) {
  const portal = usePortal(); const { activeRole } = portal;
  const drawer = useDrawer();
  const searchParams = useSearchParams();
  const Editor = setup ? InlineSubView : WorkPage;
  const choices = CRUD_SECTIONS[section].filter(key => !!setup || !['academic_offerings', 'groups', 'group_offerings', 'annual_fee_schedules', 'annual_payment_channels'].includes(key));
  const [collection, setCollection] = useState(setup?.collection || choices[0]);
  const preparingAnnualFees = collection === 'annual_fee_schedules' && ['SCOLARITE', 'INSCRIPTION'].includes(setup?.category || '');
  const preparingPaymentChannels = collection === 'annual_payment_channels' && Boolean(setup);
  const preparingFinancialSettings = preparingAnnualFees || preparingPaymentChannels;
  const baseSpec = catalogSpec(collection);
  const spec = collection === 'programs' ? { ...baseSpec, fields: [...baseSpec.fields, { key: 'level_ids', label: 'Niveaux disponibles', type: 'text' as const }] } : preparingPaymentChannels ? { ...baseSpec, fields: baseSpec.fields.map(field => field.key === 'method' ? { ...field, options: field.options?.map(option => ({ ...option, label: displayLabel(option.value) })) } : field) } : baseSpec;
  const tableFields = spec.fields.filter(field => field.type !== 'textarea' && !(preparingFinancialSettings && ['academic_year_id', 'category'].includes(field.key))).map(field => preparingAnnualFees ? { ...field, label: ({ program_id: 'Filière', level_id: 'Niveau', delivery_mode: 'Mode' } as Record<string, string>)[field.key] || field.label } : field);
  const journey = CATALOG_JOURNEYS[collection];
  const [data, setData] = useState<CatalogSnapshot | null>(null); const [error, setError] = useState(''); const [retry, setRetry] = useState(0);
  const [query, setQuery] = useState(''); const [archived, setArchived] = useState(false); const [feedback, setFeedback] = useState('');
  // null reprend les rattachements d’origine ; [] conserve une sélection décochée.
  const [offeringSelection, setOfferingSelection] = useState<string[] | null>(null);
  const [annualVariants, setAnnualVariants] = useState<AnnualOfferingVariant[]>([]);
  const [annualProposalIds, setAnnualProposalIds] = useState<string[]>([]);
  const [inlineReference, setInlineReference] = useState<{ collection: 'programs' | 'levels'; editId?: string } | null>(null);
  const [inlineBusy, setInlineBusy] = useState(false);
  const [inlineError, setInlineError] = useState('');
  const [inlineSavedId, setInlineSavedId] = useState<string>();
  const [guided, setGuided] = useState(false);
  const [dialog, setDialog] = useState<'create' | 'edit' | 'archive' | 'details' | 'validate_prefilled' | null>(null); const [selected, setSelected] = useState<DatabaseRow | null>(null);
  const pendingResume = useRef<HistoryRecord | null>(null); const [sourceRowId, setSourceRowId] = useState<string | undefined>();
  const [form, setForm] = useState<Record<string, string>>({}); const [reason, setReason] = useState(''); const [saving, setSaving] = useState(false); const [saveError, setSaveError] = useState('');
  const setupYearId = setup?.yearId; const setupCategory = setup?.category; const forceCreate = setup?.createOnLoad;
  const canEdit = portal.globalAccess && portal.perms.permissions.includes(spec.write);
  const lastParamRef = useRef<string | null>(null);

  const [loadedPreviousYear, setLoadedPreviousYear] = useState<{ id: string; name: string } | null>(null);
  const [loadedPreviousSummary, setLoadedPreviousSummary] = useState<ReconductConfigSummary | null>(null);
  const [loadedPrefilledItems, setLoadedPrefilledItems] = useState<string[]>([]);
  const [excludedPrefilledIds, setExcludedPrefilledIds] = useState<string[]>([]);
  const [dismissPrefilled, setDismissPrefilled] = useState(false);
  const [prefilledBusy, setPrefilledBusy] = useState(false);
  const [prefilledError, setPrefilledError] = useState('');
  const [prefilledReason, setPrefilledReason] = useState('');

  useEffect(() => {
    setExcludedPrefilledIds([]);
  }, [collection, setupCategory]);

  const effectivePreviousYear = setup?.previousYear || loadedPreviousYear;
  const effectivePreviousSummary = setup?.previousSummary || loadedPreviousSummary;
  const effectiveStepKey = setup?.stepKey || collectionToStep(collection, setupCategory);
  const effectivePrefilledItems = setup?.prefilledItems || (effectivePreviousSummary && effectiveStepKey ? getStepPreFilledItems(effectiveStepKey, effectivePreviousSummary) : loadedPrefilledItems);
  const stepTitle = getStepTitle(effectiveStepKey, collection, setupCategory);

  useEffect(() => {
    if (effectivePreviousYear && setup?.yearName) {
      setPrefilledReason(`Validation des ${stepTitle.toLowerCase()} pré-remplies depuis ${effectivePreviousYear.name} pour ${setup.yearName}`);
    }
  }, [effectivePreviousYear, setup?.yearName, stepTitle]);

  useEffect(() => {
    if (!setupYearId || (setup?.previousYear !== undefined && setup?.previousSummary !== undefined)) return;
    const controller = new AbortController();
    void loadYearPreparation(setupYearId, activeRole, controller.signal).then(res => {
      if (controller.signal.aborted) return;
      if (res.previousYear) setLoadedPreviousYear(res.previousYear);
      if (res.previousSummary) {
        setLoadedPreviousSummary(res.previousSummary);
        const step = setup?.stepKey || collectionToStep(collection, setupCategory);
        if (step) {
          setLoadedPrefilledItems(getStepPreFilledItems(step, res.previousSummary));
        }
      }
    }).catch(() => {});
    return () => controller.abort();
  }, [setupYearId, setup?.previousYear, setup?.previousSummary, setup?.stepKey, collection, setupCategory, activeRole]);

  useEffect(() => {
    const raw = setup?.collection || searchParams.get('collection');
    const requested = raw === 'group_offerings' ? 'groups' : raw;
    if (requested && requested !== lastParamRef.current && (requested === 'groups' || setup?.collection || !['academic_offerings', 'groups', 'group_offerings', 'annual_fee_schedules', 'annual_payment_channels'].includes(requested)) && CRUD_SECTIONS[section].includes(requested)) {
      lastParamRef.current = requested;
      setCollection(requested);
    }
  }, [section, searchParams, setup?.collection]);
  useEffect(() => {
    const controller = new AbortController(); setData(null); setError(''); setDialog(null); setOfferingSelection(null);
    void loadCatalog(collection, activeRole, controller.signal, setupYearId).then(result => {
      if (controller.signal.aborted) return;
      setData(result);
      const loadedSpec = catalogSpec(collection);
      const editing = setup?.editId ? result.tables[collection]?.find(row => row.id === setup.editId) : null;
      const hasPrefilledToReview = !dismissPrefilled && Boolean(setupYearId && (effectivePrefilledItems.length > 0 || (setup?.prefilledItems && setup.prefilledItems.length > 0)));
      if (canEdit && editing) {
        setSelected(editing); setSourceRowId(undefined); setDialog('edit'); setSaveError('');
        setReason('Modification des niveaux de la filière');
        setForm({ ...initialValues(loadedSpec.fields, result, setupYearId || '', setupCategory, editing, collection), level_ids: String(editing.level_ids || '') });
      } else if (canEdit && !setup?.editId && !hasPrefilledToReview && (forceCreate || (forceCreate !== false && setupYearId && !(result.tables[collection] || []).some(row => !row.archived_at && (!setupCategory || row.category === setupCategory)))) && loadedSpec.fields.every(field => !field.reference || field.required === false || result.tables[field.reference]?.some(row => !row.archived_at && row.active !== false))) {
        setSelected(null); setSourceRowId(undefined); setDialog('create'); setSaveError('');
        setReason(`Création dans ${loadedSpec.title.toLocaleLowerCase('fr')}`);
        setForm(completeRelations(collection, result, initialValues(loadedSpec.fields, result, setupYearId || '', setupCategory)));
      }
      if (setup?.editId && !editing) throw new Error('La filière à compléter est introuvable. Revenez aux formations et actualisez les données.');
      const source = pendingResume.current;
      if (source) {
        setSelected(null); setSourceRowId(source.id); setDialog('create'); setReason('Reprise vérifiée du référentiel historique'); setSaveError('');
        setForm(Object.fromEntries(catalogSpec(collection).fields.map(field => [field.key, String(source.values[field.key === 'name' && collection === 'levels' ? 'libelle' : HISTORY_CRUD_FIELDS[field.key] || field.key] ?? '')])));
        pendingResume.current = null;
      }
    }).catch(cause => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Chargement impossible.'); });
    return () => controller.abort();
  }, [collection, activeRole, retry, setupYearId, setupCategory, forceCreate, canEdit, dismissPrefilled, effectivePrefilledItems.length, setup?.prefilledItems, setup?.editId]);
  const sourceTable = Object.entries(HISTORY_CRUD_TABLES).find(([, target]) => target === collection)?.[0];
  const sources = !setup && portal.history.enabled && sourceTable ? (portal.history.catalog?.references[sourceTable] || []).filter(row => !data?.historyLinks?.some(link => link.sourceRowId === row.id)) : [];
  const sourceById = new Map(sources.map(source => [`source:${source.id}`, source]));
  const sourceRecords: DatabaseRow[] = sources.map(source => ({ id: `source:${source.id}`, ...Object.fromEntries(spec.fields.filter(field => !field.reference).map(field => [field.key, source.values[field.key === 'name' && collection === 'levels' ? 'libelle' : HISTORY_CRUD_FIELDS[field.key] || field.key]])) }));
  const display = (field: CrudField, row: DatabaseRow) => {
    if (preparingPaymentChannels && field.key === 'method') return displayLabel(String(row.method || ''));
    if (preparingAnnualFees && field.key === 'amount') return feeAmount(row.amount);
    if (preparingAnnualFees && field.reference && field.required === false && !row[field.key]) return emptyReferenceLabel(field);
    if (field.key === 'level_ids') return (data?.tables.levels || []).filter(level => String(row.level_ids || '').split(',').includes(level.id)).map(level => String(level.name)).join(', ') || 'Aucun niveau renseigné';
    if (row.isPrefilled) {
      if (field.key === 'academic_year_id') {
        return setup?.yearName || 'Année cible';
      }
      if (field.key === 'curriculum_id') {
        const found = data?.tables.curricula?.find(ref => ref.id === row.curriculum_id);
        return String(found?.name || row._curriculumName || row._programName || row.name || 'Formation');
      }
      if (field.key === 'level_id') {
        const found = data?.tables.levels?.find(ref => ref.id === row.level_id);
        return String(found?.name || row._levelName || 'Niveau');
      }
      if (field.key === 'program_id') {
        const found = data?.tables.programs?.find(ref => ref.id === row.program_id);
        return String(found?.name || row._programName || (field.required === false ? 'Toutes les filières' : 'Filière'));
      }
      if (field.key === 'delivery_mode') {
        return row.delivery_mode ? (field.options?.find(option => option.value === row.delivery_mode)?.label || String(row.delivery_mode)) : 'Tous modes';
      }
      if (field.key === 'category') {
        return row.category === 'INSCRIPTION' ? 'Inscription' : 'Scolarité';
      }
      if (field.key === 'amount') {
        return row.amount != null ? `${Number(row.amount).toLocaleString('fr-FR')} FCFA` : '0 FCFA';
      }
      if (field.key === 'name') {
        return String(row.name || row._curriculumName || row._programName || '');
      }
      if (field.key === 'method') {
        return String(row.method || '');
      }
    }
    const source = sourceById.get(row.id);
    if (source && field.reference) {
      const key = ({ academic_year_id: 'annee_scolaire_id', level_id: 'niveau_id' } as Record<string, string>)[field.key];
      return key && source.values[key] != null && portal.history.catalog ? historyValue(key, source.values[key], source, portal.history.catalog) : 'À compléter';
    }
    return field.key === 'delivery_mode' && !row[field.key] ? 'Tous modes' : field.type === 'select' ? field.options?.find(option => option.value === row[field.key])?.label || 'À compléter' : field.reference && field.required === false && !row[field.key] ? emptyReferenceLabel(field) : field.reference ? String(data?.tables[field.reference]?.find(ref => ref.id === row[field.key])?.name || 'Non renseigné') : row[field.key] == null || row[field.key] === '' ? 'À compléter' : String(row[field.key]);
  };
  const groupFormations = (row: DatabaseRow) => {
    if (row.isPrefilled) {
      return String(row._associatedOfferings || row._summaryText || 'Formations d’après l’année précédente');
    }
    const ids = new Set((data?.tables.group_offerings || []).filter(link => link.group_id === row.id && !link.archived_at).map(link => link.offering_id));
    const names = (data?.tables.academic_offerings || []).filter(offering => ids.has(offering.id) && !offering.archived_at).map(offering => String(offering.name));
    return names.length ? [...new Set(names)].join(' ; ') : 'Aucune formation renseignée';
  };

  const savedRows = (data?.tables[collection] || []).filter(row => Boolean(row.archived_at) === archived && (!setup?.category || row.category === setup.category));
  const hasSavedRows = savedRows.length > 0;
  const hasPrefilled = !dismissPrefilled && (collection === 'academic_offerings' || preparingFinancialSettings || !hasSavedRows) && Boolean(setupYearId && effectivePreviousYear && (effectivePrefilledItems.length > 0 || effectivePreviousSummary));

  const allPrefilledRows: DatabaseRow[] = hasPrefilled ? buildPrefilledRows({
    collection,
    category: setupCategory,
    targetYearId: setupYearId!,
    summary: effectivePreviousSummary,
    items: effectivePrefilledItems,
  }) : [];

  const savedFeeScopes = new Set((data?.tables.annual_fee_schedules || []).map(feeScopeKey));
  const savedPaymentChannels = new Set((data?.tables.annual_payment_channels || []).map(paymentChannelKey));
  const availableProposals = collection === 'academic_offerings' && data && setupYearId
    ? annualOfferingProposals(data, setupYearId, allPrefilledRows)
    : preparingAnnualFees ? allPrefilledRows.filter(row => !savedFeeScopes.has(feeScopeKey(row)))
    : preparingPaymentChannels ? allPrefilledRows.filter(row => !savedPaymentChannels.has(paymentChannelKey(row))) : allPrefilledRows;
  const prefilledRows = availableProposals.filter(row => !excludedPrefilledIds.includes(row.id));

  const rows = [...savedRows, ...prefilledRows, ...(archived ? [] : sourceRecords)].filter(row => spec.fields.some(field => display(field, row).toLocaleLowerCase('fr').includes(query.toLocaleLowerCase('fr')) || (preparingAnnualFees && field.key === 'amount' && String(row.amount).includes(query))) || (row._summaryText && String(row._summaryText).toLocaleLowerCase('fr').includes(query.toLocaleLowerCase('fr'))));
  const prerequisites = spec.fields.filter(field => field.reference && field.required !== false && data && !(data.tables[field.reference] || []).some(row => !row.archived_at && row.active !== false));
  const choose = (key: string) => {
    if (setup) { setup.onChoose(key); return; }
    lastParamRef.current = key;
    pendingResume.current = null;
    setCollection(key);
    setQuery('');
    setArchived(false);
    setFeedback('');
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('collection', key);
      window.history.replaceState(window.history.state, '', url);
    }
  };
  const resume = (source: HistoryRecord) => { pendingResume.current = source; setRetry(value => value + 1); };
  const fillRelations = (values: Record<string, string>) => {
    if (values.level_id !== form.level_id || values.academic_year_id !== form.academic_year_id) setOfferingSelection([]);
    return completeRelations(collection, data, values);
  };
  const groupChoices = (data?.tables.academic_offerings || []).filter(row => !row.archived_at && row.level_id === form.level_id && row.academic_year_id === form.academic_year_id);
  const offeringIds = offeringSelection ?? (collection === 'groups' && data ? groupOfferingSelection(data, selected, form.academic_year_id, form.level_id) : []);
  const creatingGroup = collection === 'groups' && !sourceRowId && (dialog === 'create' || (dialog === 'edit' && groupChoices.length > 0));
  const creatingOfferings = collection === 'academic_offerings' && dialog === 'create' && !sourceRowId;
  const submitLabel = creatingOfferings ? 'Enregistrer les niveaux' : preparingFinancialSettings ? dialog === 'archive' ? 'Vérifier l’archivage' : preparingAnnualFees ? 'Enregistrer le tarif' : 'Enregistrer le moyen de paiement' : 'Enregistrer';
  const annualPrograms = (data?.tables.programs || []).filter(row => !row.archived_at && row.active !== false);
  const annualCurricula = (data?.tables.curricula || []).filter(row => !row.archived_at && row.status !== 'ARCHIVED' && row.program_id === form.program_id);
  const savedAnnualVariants = (programId: string) => (data?.tables.academic_offerings || [])
    .filter(row => !row.archived_at && row.academic_year_id === form.academic_year_id
      && data?.tables.curricula?.some(curriculum => curriculum.id === row.curriculum_id && curriculum.program_id === programId))
    .map(row => ({ curriculum_id: String(row.curriculum_id), delivery_mode: row.delivery_mode ? String(row.delivery_mode) : null }));
  const existingAnnualVariants = creatingOfferings ? savedAnnualVariants(form.program_id) : [];
  const annualLevelName = (curriculumId: unknown) => {
    const curriculum = data?.tables.curricula?.find(row => row.id === curriculumId);
    return String(data?.tables.levels?.find(row => row.id === curriculum?.level_id)?.name || 'Niveau à préciser');
  };
  const open = (mode: typeof dialog, row: DatabaseRow | null = null) => {
    const nextForm = completeRelations(collection, data, initialValues(spec.fields, data, setup?.yearId || portal.academicYearContext?.selectedYearId || '', setup?.category, row, collection));
    setFeedback('');
    setOfferingSelection(null); setSourceRowId(undefined); setDialog(mode); setSelected(row); setSaveError('');
    setAnnualVariants([]); setAnnualProposalIds([]);
    let defaultReason = mode === 'create' ? `Création dans ${spec.title.toLocaleLowerCase('fr')}` : '';
    if (collection === 'academic_years' && mode === 'create') {
      const suggested = suggestNextAcademicYear(data?.tables.academic_years || []);
      if (suggested.previousYear) {
        defaultReason = `Création de l’année universitaire ${suggested.name} d’après l’année précédente (${String(suggested.previousYear.name)})`;
      }
    } else if (row?.isPrefilled) {
      defaultReason = `Enregistrement de ${rowTitle(row)} pré-rempli(e) pour ${setup?.yearName || ''}`;
    }
    setReason(defaultReason);
    setForm({ ...nextForm, ...(collection === 'academic_offerings' && mode === 'create' ? { program_id: annualPrograms.length === 1 ? annualPrograms[0].id : '' } : {}) });
  };
  const manageAnnualGroup = (group: AnnualOfferingGroup) => {
    open('create');
    setForm(values => ({ ...values, program_id: group.programId }));
    setAnnualVariants(group.rows.filter(row => group.programId && row.curriculum_id).map(row => ({ curriculum_id: String(row.curriculum_id), delivery_mode: row.delivery_mode ? String(row.delivery_mode) : null })));
    setAnnualProposalIds(group.rows.filter(row => row.isPrefilled).map(row => row.id));
    if (group.rows.some(row => !row.isPrefilled)) setReason('Modification des niveaux proposés pour cette année');
  };
  const rowTitle = (row: DatabaseRow | null) => row ? collection === 'academic_offerings' && data ? annualOfferingLabel(row, data) : String(row.name || row.code || (row.category ? `${row.category} · ${row.amount} FCFA` : row.isPrefilled ? 'Élément proposé' : row.id)) : spec.title;
  const fixedField = (field: CrudField) => {
    if (setup && field.reference && field.required === false && !(data?.tables[field.reference] || []).some(row => !row.archived_at && row.active !== false)) return true;
    if (field.key === 'level_id' && collection === 'academic_offerings' && data?.tables.curricula?.find(row => row.id === form.curriculum_id)?.level_id) return true;
    if (field.key === 'level_id' && collection === 'group_offerings' && data?.tables.groups?.find(row => row.id === form.group_id)?.level_id) return true;
    return !!setup && (field.key === 'academic_year_id' || (!!setup.category && field.key === 'category'));
  };

  const removePrefilled = (row: DatabaseRow) => {
    setExcludedPrefilledIds(prev => [...prev, row.id]);
    setFeedback(`${rowTitle(row)} retiré(e) de la proposition.`);
    if (selected?.id === row.id) {
      setSelected(null);
      setDialog(null);
    }
  };
  const removeAnnualGroup = async (group: AnnualOfferingGroup, removalReason: string) => {
    if (!data || !canEdit) throw new Error('Retrait non autorisé.');
    const saved = group.rows.filter(row => !row.isPrefilled);
    const yearId = setup?.yearId || portal.academicYearContext?.selectedYearId || '';
    if (saved.length) {
      const result = await mutateCatalog('academic_offerings', { revision: data.revision, reason: removalReason, values: { academic_year_id: yearId, archive_ids: saved.map(row => row.id) } }, activeRole, undefined, false, yearId);
      const ids = new Set(saved.map(row => row.id));
      setData(current => current ? { ...current, revision: result.revision, tables: { ...current.tables, academic_offerings: (current.tables.academic_offerings || []).map(row => ids.has(row.id) ? { ...row, archived_at: new Date().toISOString() } : row) } } : current);
      portal.refreshCampus();
    }
    const removedKeys = new Set(group.rows.map(offeringVariantKey));
    setExcludedPrefilledIds(current => [...new Set([...current, ...group.rows.filter(row => row.isPrefilled).map(row => row.id), ...allPrefilledRows.filter(row => row.curriculum_id && removedKeys.has(offeringVariantKey(row))).map(row => row.id)])]);
    drawer?.markSaved();
    setFeedback(`${group.name} : ligne retirée.`);
  };

  const handleConfirmSinglePrefilled = async () => {
    if (!selected || !setupYearId) return;
    setPrefilledBusy(true);
    setPrefilledError('');
    try {
      const values: Record<string, unknown> = Object.fromEntries(spec.fields.map(field => [field.key, field.type === 'number' ? Number(form[field.key]) : form[field.key]]));
      if (collection === 'academic_offerings') {
        values.academic_year_id = setupYearId;
        values.curriculum_id = selected.curriculum_id || form.curriculum_id;
        values.level_id = selected.level_id || form.level_id;
        values.delivery_mode = selected.delivery_mode || form.delivery_mode || 'PRESENTIEL';
      } else if (collection === 'groups') {
        values.academic_year_id = setupYearId;
        values.name = selected.name || form.name;
        values.level_id = selected.level_id || form.level_id;
        const resolvedOfferings = offeringIds.length > 0 ? offeringIds : groupOfferingSelection(data, selected, setupYearId, String(values.level_id));
        values.offering_ids = resolvedOfferings.length > 0 ? resolvedOfferings : (data?.tables.academic_offerings || []).filter(o => !o.archived_at && o.academic_year_id === setupYearId && o.level_id === values.level_id).map(o => o.id);
      } else if (collection === 'annual_fee_schedules') {
        values.academic_year_id = setupYearId;
        values.category = selected.category || form.category || setupCategory || 'SCOLARITE';
        values.amount = Number(selected.amount || form.amount || 0);
        values.program_id = selected.program_id || form.program_id || null;
        values.level_id = selected.level_id || form.level_id || null;
        values.delivery_mode = selected.delivery_mode || form.delivery_mode || null;
      } else if (collection === 'annual_payment_channels') {
        values.academic_year_id = setupYearId;
        values.name = selected.name || form.name;
        values.method = selected.method || form.method;
      }
      await mutateCatalog(collection, { revision: data?.revision || 0, reason: prefilledReason, values }, activeRole, undefined, false, setupYearId);
      setExcludedPrefilledIds(prev => [...prev, selected.id]);
      setFeedback(`${rowTitle(selected)} : validation enregistrée.`);
      setDialog(null);
      setRetry(v => v + 1);
      portal.refreshCampus();
    } catch (err) {
      setPrefilledError(err instanceof Error ? err.message : 'Validation impossible.');
    } finally {
      setPrefilledBusy(false);
    }
  };

  const handleConfirmPrefilled = async () => {
    if (!effectivePreviousYear || !effectiveStepKey || !setupYearId) return;
    setPrefilledBusy(true);
    setPrefilledError('');
    try {
      const res = await reconductYearPreparation({
        targetYearId: setupYearId,
        previousYearId: effectivePreviousYear.id,
        revision: data?.revision || 0,
        reason: prefilledReason,
        step: effectiveStepKey,
      }, activeRole);
      setFeedback(`${stepTitle} : ${res.count || effectivePrefilledItems.length} élément(s) enregistré(s) d’après ${effectivePreviousYear.name}.`);
      setDismissPrefilled(true);
      setDialog(null);
      setRetry(v => v + 1);
      portal.refreshCampus();
    } catch (err) {
      setPrefilledError(err instanceof Error ? err.message : 'Enregistrement impossible.');
    } finally {
      setPrefilledBusy(false);
    }
  };

  const savedProgramCount = data && collection === 'academic_offerings' ? groupAnnualOfferings(savedRows, data).filter(group => group.programId).length : 0;
  const proposedProgramCount = data && collection === 'academic_offerings' ? groupAnnualOfferings(prefilledRows, data).filter(group => group.programId).length : 0;
  const nextCollection = journey?.next && choices.includes(journey.next) ? journey.next : undefined;
  const refreshAfterInline = async (savedId = inlineSavedId) => {
    if (!inlineReference) return;
    setInlineSavedId(savedId); setInlineBusy(true); setInlineError('');
    try {
      const updated = await loadCatalog(collection, activeRole, undefined, setupYearId);
      const programId = inlineReference.collection === 'programs' ? savedId || inlineReference.editId : undefined;
      if (programId && !updated.tables.programs?.some(row => row.id === programId)) throw new Error('La filière a été enregistrée mais sa relecture a échoué. Réessayez.');
      setData(updated);
      if (programId) {
        if (programId !== form.program_id) setAnnualVariants([]);
        else setAnnualVariants(variants => variants.filter(variant => updated.tables.curricula?.some(curriculum => curriculum.id === variant.curriculum_id && !curriculum.archived_at && curriculum.status !== 'ARCHIVED')));
        setForm(values => ({ ...values, program_id: programId }));
      }
      if (inlineReference.collection === 'levels' && savedId) setForm(values => ({ ...values, level_ids: [...new Set([...(values.level_ids || '').split(',').filter(Boolean), savedId])].join(',') }));
      setInlineReference(null);
    } catch (cause) {
      setInlineError(cause instanceof Error ? cause.message : 'Relecture des informations impossible.');
    } finally { setInlineBusy(false); }
  };
  const beginInline = (reference: 'programs' | 'levels', editId?: string) => {
    setInlineSavedId(undefined); setInlineError(''); setInlineReference({ collection: reference, editId });
  };
  if (inlineReference && setup) return <div>
    {inlineBusy ? <LoadingState label="Actualisation des filières et niveaux…" /> : inlineError ? <section role="alert"><p>{inlineError}</p><button className="btn btn-outline" onClick={() => void refreshAfterInline()}>Réessayer la lecture</button></section> : <>
      <DrawerCloseButton className="btn btn-outline" onClose={() => setInlineReference(null)}>{collection === 'academic_offerings' ? 'Revenir aux formations de l’année' : 'Revenir à la filière'}</DrawerCloseButton>
      <ReferenceCrudWorkspace key={`${inlineReference.collection}:${inlineReference.editId || 'new'}`} section={inlineReference.collection === 'programs' ? 'acad_program' : 'acad_reference'} setup={{ collection: inlineReference.collection, yearId: setup.yearId, yearName: setup.yearName, createOnLoad: true, editId: inlineReference.editId, onCancel: () => setInlineReference(null), onChoose: () => {}, onSaved: id => void refreshAfterInline(id) }} />
    </>}
  </div>;
  return <div className={preparingAnnualFees ? 'annual-fee-workspace' : preparingPaymentChannels ? 'annual-payment-workspace' : undefined}>
    <div className={setup ? 'setup-actions' : 'page-intro'}>
      {setup ? (
        <div>
          <h2>{preparingFinancialSettings ? stepTitle : spec.title}</h2>
        </div>
      ) : (
        <div>
          <span className="page-eyebrow">{section.startsWith('log_') ? 'ACHATS ET LOGISTIQUE' : 'GESTION ACADÉMIQUE'}</span>
          <h1>{section === 'acad_program' ? 'Programmes de cours et matières' : collection === 'academic_years' ? 'Années scolaires' : section === 'acad_reference' ? 'Préparer et gérer l’année' : spec.title}</h1>
          <p>{journey?.purpose}</p>
        </div>
      )}
      {canEdit && !dialog && <button className="btn btn-primary" disabled={!data} onClick={() => prerequisites.length ? setGuided(true) : open('create')}>{collection === 'academic_offerings' ? 'Ajouter une filière pour cette année' : `Ajouter ${spec.singular}`}</button>}
    </div>
    {!setup && choices.length > 1 && <label className="workspace-picker">Rubrique<select className="select-input" value={collection} onChange={event => choose(event.target.value)}>{choices.map(key => <option value={key} key={key}>{catalogSpec(key).title}</option>)}</select></label>}
    {collection === 'academic_years' && data && <AcademicYearLifecycle rows={data.tables.academic_years || []} revision={data.revision} onView={row => open('details', row)} onEdit={canEdit ? row => open('edit', row) : undefined} onSaved={() => { setRetry(value => value + 1); portal.reloadCampus(); portal.history.retry(); }} />}
    {feedback && setup && collection === 'academic_offerings' ? <p className="annual-offering-feedback" role="status">{feedback}</p> : feedback && <ActionResult title={feedback} nextLabel={setup ? 'Retourner à la préparation de l’année' : (nextCollection ? journey.nextLabel : undefined)} onNext={setup ? () => setup.onSaved() : (nextCollection ? () => choose(nextCollection) : undefined)} onDismiss={() => setFeedback('')}>{journey?.result}</ActionResult>}
    {canEdit && data && prerequisites.length > 0 && <section className="prerequisite-panel"><p>Cette opération utilise des informations qui restent à enregistrer. Complétez-les dans l’ordre, puis poursuivez ici.</p><button className="btn btn-primary" onClick={() => setGuided(true)}>Compléter dans l’ordre</button></section>}
    {guided && <CatalogTaskDialog root={collection} yearId={setup?.yearId} yearName={setup?.yearName} category={setup?.category} onClose={() => setGuided(false)} onSaved={() => { setGuided(false); setRetry(value => value + 1); if (setup) setup.onSaved(); else { setFeedback(`${spec.title} : enregistrement confirmé`); portal.refreshCampus(); } }} />}
    {error ? <section className="card" role="alert"><p>{error}</p><IconButton className="btn btn-outline" onClick={() => setRetry(value => value + 1)} label="Réessayer" /></section> : !data ? <LoadingState label="Chargement du référentiel…" /> : collection === 'academic_years' ? <>{sources.length > 0 && <details className="card"><summary>Années aux dates à compléter ({sources.length})</summary>{sourceRecords.map(row => <div className="academic-year-row" key={row.id}><strong>{rowTitle(row)}</strong>{canEdit && <button className="btn btn-outline" onClick={() => resume(sourceById.get(row.id)!)}>Compléter les dates</button>}</div>)}</details>}</> : (setup && dialog ? null : <section className="card card-full"><div className="directory-toolbar" hidden={!!setup && !rows.length && (!preparingFinancialSettings || !query)}><label>Rechercher<input className="input" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder={preparingAnnualFees ? 'Filière, niveau ou montant' : preparingPaymentChannels ? 'Caisse, organisme ou moyen de paiement' : `Nom ou code · ${spec.title.toLocaleLowerCase('fr')}`} /></label><label hidden={!!setup}>Afficher<select className="select-input" value={archived ? 'archived' : 'active'} onChange={event => setArchived(event.target.value === 'archived')}><option value="active">Enregistrements disponibles</option><option value="archived">Enregistrements archivés</option></select></label></div>
      {collection === 'academic_offerings' ? <AnnualOfferingList allRows={[...savedRows, ...prefilledRows]} onRemoveGroup={removeAnnualGroup} rows={rows} snapshot={data} canEdit={canEdit} previousYear={effectivePreviousYear?.name} onManage={manageAnnualGroup} onEdit={row => open('edit', row)} onArchive={row => open('archive', row)} onRemove={removePrefilled} /> : <ResponsiveTable className="data-table"><thead><tr>{tableFields.map(field => <th key={field.key} className={preparingAnnualFees && field.key === 'amount' ? 'annual-fee-amount' : undefined}>{field.label}</th>)}{collection === 'groups' && <th>Formations associées</th>}{(Boolean(setup) || collection === 'academic_years') && <th>État</th>}<th>Actions</th></tr></thead><tbody>{rows.map(row => <tr key={row.id}>{tableFields.map((field, fIdx) => {
        const isPrimary = (collection === 'academic_offerings' && field.key === 'curriculum_id') ||
          (collection === 'annual_fee_schedules' && field.key === 'amount') ||
          (field.key === 'name') ||
          (fIdx === 0 && collection !== 'academic_offerings' && collection !== 'annual_fee_schedules');
        return <td key={field.key} className={preparingAnnualFees && field.key === 'amount' ? 'annual-fee-amount' : undefined}>{display(field, row)}{Boolean(isPrimary && row.isPrefilled && !setup) && <div className="cell-sub"><span className="pill pill-warning">En attente de validation</span>{effectivePreviousYear && <span> · Pré-rempli ({effectivePreviousYear.name})</span>}</div>}{field.key === 'name' && sourceById.has(row.id) && <div className="cell-sub">{collection === 'academic_years' ? 'Dates à confirmer avant utilisation' : 'Informations à compléter avant utilisation'}</div>}</td>;
      })}{collection === 'groups' && <td>{groupFormations(row)}</td>}{Boolean(setup) && collection !== 'academic_years' && <td>{Boolean(row.isPrefilled) ? <span className="pill pill-warning">À valider</span> : <span className="pill pill-success">Enregistré</span>}</td>}{collection === 'academic_years' && <td>{sourceById.has(row.id) ? <span className="pill pill-warning">À compléter</span> : portal.academicYearContext?.currentYearId === row.id ? <span className="pill pill-success">Année de travail</span> : <span className="pill pill-default">{YEAR_STATUS_LABELS[row.status as YearStatus] || 'État à vérifier'}</span>}</td>}<td><div className="btn-group" style={{ display: 'inline-flex', flexDirection: 'row', alignItems: 'center', gap: '8px', flexWrap: 'nowrap' }}><IconButton className="btn btn-sm btn-outline" onClick={() => open('details', row)} label="Voir" />{Boolean(row.isPrefilled) ? <><IconButton className="btn btn-sm btn-outline" onClick={() => open('edit', row)} label="Modifier" /><IconButton className="btn btn-sm btn-outline btn-danger" onClick={() => removePrefilled(row)} label="Retirer" /><IconButton className="btn btn-sm btn-primary" onClick={() => open('validate_prefilled', row)} label="Valider" /></> : canEdit && !row.archived_at && <>{sourceById.has(row.id) ? <IconButton className="btn btn-sm btn-outline" onClick={() => resume(sourceById.get(row.id)!)} label="Compléter les informations" /> : <><IconButton className="btn btn-sm btn-outline" onClick={() => open('edit', row)} label="Modifier" /><IconButton className="btn btn-sm btn-outline btn-danger" onClick={() => open('archive', row)} label="Archiver" /></>}</>}</div></td></tr>)}{!rows.length && <tr><td colSpan={tableFields.length + (['academic_years', 'groups'].includes(collection) ? 2 : 1) + (Boolean(setup) && collection !== 'academic_years' ? 1 : 0)}>{query ? 'Aucun résultat. Modifiez la recherche ou effacez-la pour retrouver la liste.' : archived ? 'Aucun enregistrement archivé.' : `Aucun enregistrement. ${canEdit && !prerequisites.length ? `Commencez par « Ajouter ${spec.singular} ».` : 'Les références nécessaires sont indiquées au-dessus.'}`}</td></tr>}</tbody></ResponsiveTable>}
    </section>)}
    {setup?.onDone && data && !dialog && !error && <footer className="annual-offering-footer">
      <p>
        <strong>
          {collection === 'academic_offerings'
            ? `${savedProgramCount} ${savedProgramCount === 1 ? 'filière enregistrée' : 'filières enregistrées'}`
            : preparingAnnualFees ? `${savedRows.length} tarif${savedRows.length > 1 ? 's' : ''} enregistré${savedRows.length > 1 ? 's' : ''}`
            : preparingPaymentChannels ? `${savedRows.length} moyen${savedRows.length > 1 ? 's' : ''} de paiement enregistré${savedRows.length > 1 ? 's' : ''}`
            : `${savedRows.length} ${savedRows.length <= 1 ? `${spec.singular} enregistré(e)` : `${spec.title.toLocaleLowerCase('fr')} enregistré(e)s`}`}
        </strong>
        {(collection === 'academic_offerings' ? proposedProgramCount > 0 : prefilledRows.length > 0) && (
          <span>
            {collection === 'academic_offerings'
              ? `${proposedProgramCount} ${proposedProgramCount === 1 ? 'proposition non enregistrée' : 'propositions non enregistrées'}`
              : `${prefilledRows.length} ${prefilledRows.length === 1 ? 'proposition non enregistrée' : 'propositions non enregistrées'}`}
          </span>
        )}
      </p>
      <DrawerActions><DrawerCloseButton className="btn btn-primary" onClose={setup.onDone}>Retour à la préparation</DrawerCloseButton></DrawerActions>
    </footer>}
    {dialog && data && <Editor busy={saving || prefilledBusy || inlineBusy} title={creatingOfferings ? `Choisir une filière et ses niveaux${setup?.yearName ? ` · ${setup.yearName}` : ''}` : dialog === 'validate_prefilled' ? `Valider ${stepTitle.toLocaleLowerCase('fr')} pré-rempli(e)s${setup?.yearName ? ` · ${setup.yearName}` : ''}` : setup ? `${dialog === 'create' ? 'Ajouter' : dialog === 'edit' ? 'Modifier' : dialog === 'archive' ? 'Archiver' : 'Consulter'} ${spec.singular}${setup.yearName && collection !== 'programs' ? ` · ${setup.yearName}` : ''}` : sourceRowId ? `Compléter ${spec.singular}` : dialog === 'create' ? `Ajouter ${spec.singular}` : dialog === 'edit' ? `Modifier : ${rowTitle(selected)}` : dialog === 'archive' ? `Archiver : ${rowTitle(selected)}` : rowTitle(selected)} onClose={() => { if (!saving && !prefilledBusy && !inlineBusy) { setInlineReference(null); if (setup?.onCancel) setup.onCancel(); else setDialog(null); } }}>
      {inlineReference && !setup ? (
        <div>
          {inlineBusy ? <LoadingState label="Actualisation des filières et niveaux…" /> : inlineError ? <section role="alert"><p>{inlineError}</p><button className="btn btn-outline" onClick={() => void refreshAfterInline()}>Réessayer la lecture</button></section> : <>
            <DrawerCloseButton className="btn btn-outline" onClose={() => setInlineReference(null)}>Revenir à la filière</DrawerCloseButton>
            <ReferenceCrudWorkspace key={`${inlineReference.collection}:${inlineReference.editId || 'new'}`} section={inlineReference.collection === 'programs' ? 'acad_program' : 'acad_reference'} setup={{ collection: inlineReference.collection, yearId: portal.academicYearContext?.selectedYearId || '', yearName: '', createOnLoad: true, editId: inlineReference.editId, onCancel: () => setInlineReference(null), onChoose: () => {}, onSaved: id => void refreshAfterInline(id) }} />
          </>}
        </div>
      ) : dialog === 'validate_prefilled' && !preparingFinancialSettings ? (
        <ReviewedForm
          busy={prefilledBusy}
          error={prefilledError}
          confirmLabel={`Confirmer l’enregistrement de ${stepTitle.toLocaleLowerCase('fr')}`}
          fields={[
            { label: 'Rubrique', value: stepTitle },
            ...(selected ? [{ label: 'Élément sélectionné', value: rowTitle(selected) }] : []),
            { label: 'Année cible', value: setup?.yearName || '' },
            { label: 'Provenance', value: `Pré-rempli depuis l’année précédente (${effectivePreviousYear?.name || ''})` },
            { label: 'Nombre d’éléments restants', value: `${prefilledRows.length} élément(s)` },
            { label: 'Motif', value: prefilledReason },
          ]}
          consequence={`Les ${prefilledRows.length} éléments seront enregistrés pour l’année ${setup?.yearName}. Vous pourrez ensuite les modifier, ajouter ou archiver à tout moment.`}
          onConfirm={handleConfirmPrefilled}
        >
          <fieldset disabled={prefilledBusy} className="permission-fieldset">
            <p>
              Ces {prefilledRows.length} éléments proviennent du pré-remplissage automatique depuis l’année précédente ({effectivePreviousYear?.name}).
              Vérifiez le motif d’enregistrement puis confirmez pour les inscrire pour l’année {setup?.yearName}.
            </p>
            <label className="form-group">
              Motif d’enregistrement
              <textarea
                className="input"
                required
                minLength={3}
                maxLength={1000}
                value={prefilledReason}
                onChange={e => setPrefilledReason(e.target.value)}
              />
            </label>
            <DrawerActions><button className="btn btn-primary" disabled={prefilledBusy}>
              Vérifier les informations
            </button>
            {Boolean(selected?.isPrefilled) && (
              <button
                type="button"
                className="btn btn-outline"
                style={{ marginTop: '0.5rem', display: 'block' }}
                disabled={prefilledBusy}
                onClick={handleConfirmSinglePrefilled}
              >
                Valider uniquement {rowTitle(selected)}
              </button>
            )}
            </DrawerActions>
          </fieldset>
        </ReviewedForm>
      ) : dialog === 'details' && selected ? <>{Boolean(selected.isPrefilled) && <div className="card mb-3 p-3" style={{ background: 'var(--color-bg-subtle, rgba(255,255,255,0.03))', border: '1px solid var(--color-border-subtle, rgba(255,255,255,0.15))', borderRadius: '6px', marginBottom: '1rem' }}><div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}><span className="pill pill-warning">En attente de validation</span>{effectivePreviousYear && <span className="cell-sub">Pré-rempli depuis {effectivePreviousYear.name}</span>}</div><p className="cell-sub" style={{ margin: '0.25rem 0' }}>Cet enregistrement est pré-rempli pour l’année {setup?.yearName || ''}. Vous pouvez le valider, le modifier ou le retirer de la proposition.</p><div className="btn-group" style={{ marginTop: '0.75rem' }}><button type="button" className="btn btn-sm btn-primary" onClick={() => open('validate_prefilled', selected)}>Valider cet élément</button><IconButton type="button" className="btn btn-sm btn-outline" onClick={() => open('edit', selected)} label="Modifier" /><IconButton type="button" className="btn btn-sm btn-outline btn-danger" onClick={() => removePrefilled(selected)} label="Retirer de la proposition" /></div></div>}<dl className="record-details-grid">{spec.fields.map(field => <div key={field.key}><dt>{field.label}</dt><dd>{display(field, selected)}</dd></div>)}{collection === 'groups' && <div><dt>Formations associées</dt><dd>{groupFormations(selected)}</dd></div>}{selected.archived_at != null && <div><dt>Motif d’archivage</dt><dd>{String(selected.reason)}</dd></div>}</dl><p>{journey?.purpose}</p></> : <ReviewedForm reviewInitially={preparingFinancialSettings && dialog === 'validate_prefilled'} validate={() => creatingOfferings && (!form.program_id || !annualVariants.length) ? 'Choisissez une filière et au moins un niveau avec son mode de formation.' : creatingGroup && !offeringIds.length ? 'Choisissez au moins une filière pour ce groupe.' : null} key={`${collection}:${dialog}:${selected?.id || sourceRowId || ''}`} busy={saving} error={saveError} danger={dialog === 'archive'} confirmLabel={dialog === 'archive' ? 'Confirmer l’archivage' : 'Confirmer l’enregistrement'} fields={dialog === 'archive' ? [{ label: spec.title, value: rowTitle(selected) }, { label: 'Motif', value: reason }] : creatingOfferings ? [{ label: 'Année', value: setup?.yearName || String(data.tables.academic_years?.find(row => row.id === form.academic_year_id)?.name || '') }, { label: 'Filière', value: String(annualPrograms.find(row => row.id === form.program_id)?.name || '') }, { label: 'Niveaux et modes', value: annualVariants.map(variant => `${annualLevelName(variant.curriculum_id)} · ${variant.delivery_mode || 'Mode non renseigné'}`).join(', '), previous: existingAnnualVariants.map(variant => `${annualLevelName(variant.curriculum_id)} · ${variant.delivery_mode || 'Mode non renseigné'}`).join(', ') || 'Aucun' }, { label: 'Motif', value: reason }] : [...spec.fields.map(field => ({ label: field.label, value: preparingAnnualFees && field.key === 'amount' ? feeAmount(form.amount) : preparingAnnualFees && field.key === 'delivery_mode' && !form.delivery_mode ? 'Tous modes' : field.key === 'level_ids' ? display(field, { id: '', level_ids: (form.level_ids || '').split(',') }) : field.reference ? field.required === false && !form[field.key] ? emptyReferenceLabel(field) : String(data.tables[field.reference]?.find(row => row.id === form[field.key])?.name || '') : field.type === 'select' ? field.options?.find(option => option.value === form[field.key])?.label || '' : form[field.key], ...(selected ? { previous: display(field, selected) } : {}) })), ...(creatingGroup ? [{ label: 'Filières accueillies', value: groupChoices.filter(row => offeringIds.includes(row.id)).map(row => String(row.name)).join(', ') }] : []), { label: 'Motif', value: reason }]} consequence={dialog === 'archive' ? 'L’enregistrement ne sera plus proposé pour de nouvelles affectations. Les relations existantes et les anciennes valeurs seront conservées ; le motif sera audité.' : collection === 'programs' ? 'Les niveaux décochés seront archivés dans le catalogue général de cette filière. Les niveaux déjà utilisés sont protégés et leur retrait sera refusé.' : creatingOfferings ? 'La sélection sera enregistrée pour cette année. Les niveaux décochés seront archivés ; leur historique sera conservé.' : `${journey?.result || ''}${sourceRowId ? ' L’archive originale restera conservée et liée au nouvel enregistrement.' : ''}`} onConfirm={() => {
        setSaving(true); setSaveError('');
        const values: Record<string, unknown> = creatingOfferings ? { academic_year_id: form.academic_year_id, program_id: form.program_id, variants: annualVariants } : Object.fromEntries(spec.fields.map(field => [field.key, field.type === 'number' ? Number(form[field.key]) : form[field.key]]));
        if (collection === 'programs') {
          if (sourceRowId) delete values.level_ids;
          else values.level_ids = (form.level_ids || '').split(',').filter(Boolean);
        }
        if (creatingGroup) values.offering_ids = offeringIds;
        const targetId = selected?.isPrefilled ? undefined : selected?.id;
        void mutateCatalog(collection, { revision: data.revision, reason, ...(dialog === 'archive' ? {} : { values }), ...(sourceRowId ? { sourceRowId } : {}) }, activeRole, targetId, dialog === 'archive', setup?.yearId).then(result => {
          if (selected?.isPrefilled) {
            setExcludedPrefilledIds(prev => [...prev, selected.id]);
          }
          if (creatingOfferings) setExcludedPrefilledIds(ids => [...ids, ...annualProposalIds]);
          drawer?.markSaved();
          setDialog(null);
          setFeedback(creatingOfferings ? `${annualPrograms.find(program => program.id === form.program_id)?.name || 'Formation'} : niveaux enregistrés.` : dialog === 'archive' ? `${selected?.name} : archivage enregistré` : `${form.name || spec.title} : enregistrement confirmé`);
          setRetry(value => value + 1);
          portal.refreshCampus();
          if (setup) setup.onSaved(result.id);
          else {
            portal.history.retry();
          }
        }).catch(cause => setSaveError(cause instanceof Error ? cause.message : 'Enregistrement impossible.')).finally(() => setSaving(false));
      }}><fieldset disabled={saving} className="permission-fieldset">
        {collection === 'programs' && <p className="cell-sub">Catalogue général · toutes les années</p>}
        {setup?.yearId && collection !== 'programs' && <p><strong>Année : {setup.yearName}</strong>{setup.category && ` · ${setup.category === 'INSCRIPTION' ? 'Frais d’inscription' : 'Frais de scolarité'}`}</p>}
        {sourceRowId && <p>Complétez les champs officiels manquants. L’original restera conservé.</p>}
        {dialog === 'archive' ? <p>Indiquez le motif du retrait de {rowTitle(selected)}. Vous vérifierez ses conséquences avant la confirmation.</p> : spec.fields.filter(field => field.key !== 'level_ids' && !(creatingOfferings && ['curriculum_id', 'level_id', 'delivery_mode'].includes(field.key)) && !fixedField(field)).map(field => <label className="form-group" key={field.key}>{field.label}{field.type === 'reference' ? <select className="select-input" disabled={!!setup && (field.key === 'academic_year_id' || (!!setup.category && field.key === 'category'))} required={field.required !== false} value={form[field.key]} onChange={event => setForm(fillRelations({ ...form, [field.key]: event.target.value }))}><option value="">{field.required === false ? emptyReferenceLabel(field) : 'Sélectionner'}</option>{(data.tables[field.reference!] || []).filter(row => !row.archived_at && row.active !== false && (field.reference !== 'academic_years' || ['BROUILLON','OUVERTE'].includes(String(row.status))) && (!['curriculum_semesters', 'teaching_units'].includes(field.reference!) || !form.curriculum_id || row.curriculum_id === form.curriculum_id) && (field.reference !== 'academic_offerings' || !form.level_id || !row.level_id || row.level_id === form.level_id)).map(row => <option key={row.id} value={row.id}>{catalogLabel(field.reference!, row, data)}</option>)}</select> : field.type === 'select' ? <select className="select-input" disabled={!!setup && (field.key === 'academic_year_id' || (!!setup.category && field.key === 'category'))} required={field.required !== false} value={form[field.key]} onChange={event => setForm({ ...form, [field.key]: event.target.value })}><option value="">{preparingAnnualFees && field.key === 'delivery_mode' ? 'Tous modes' : 'Sélectionner'}</option>{field.options!.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select> : field.type === 'textarea' ? <textarea className="input" value={form[field.key]} maxLength={4000} onChange={event => setForm({ ...form, [field.key]: event.target.value })} /> : <input className="input" required={field.required} type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : field.type === 'email' ? 'email' : 'text'} min={field.min} step={field.type === 'number' ? field.step ?? 1 : undefined} max={field.type === 'number' ? field.max ?? (field.key === 'position' ? 32767 : 2147483647) : undefined} maxLength={160} value={form[field.key]} onChange={event => setForm({ ...form, [field.key]: event.target.value })} />}</label>)}

        {creatingOfferings && <><label className="form-group">Filière<select className="select-input" required value={form.program_id || ''} onChange={event => { setForm(values => ({ ...values, program_id: event.target.value })); setAnnualVariants(savedAnnualVariants(event.target.value)); }}><option value="">Choisir une filière</option>{annualPrograms.map(program => <option key={program.id} value={program.id}>{String(program.name)}</option>)}</select></label>{setup && canEdit && <div className="btn-group" style={{ marginBottom: '12px' }}><button type="button" className="btn btn-outline" onClick={() => beginInline('programs')}>Créer une filière ici</button>{form.program_id && <button type="button" className="btn btn-outline" onClick={() => beginInline('programs', form.program_id)}>Définir ses niveaux ici</button>}</div>}<fieldset className="offering-levels-box"><legend>Niveaux proposés pour cette année</legend><p className="cell-sub" style={{ margin: '0 0 10px' }}>Cochez plusieurs niveaux. Pour un même niveau, vous pouvez proposer le présentiel et l’enseignement en ligne.</p><div className="offering-levels-grid" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>{annualCurricula.map(curriculum => <div key={curriculum.id} className="offering-level-card"><div className="offering-level-title">{annualLevelName(curriculum.id)}</div><div className="offering-modes-grid">{['Présentiel', 'En ligne', null].map(mode => {
          const variant = { curriculum_id: curriculum.id, delivery_mode: mode };
          const key = offeringVariantKey(variant);
          const isSelected = annualVariants.some(item => offeringVariantKey(item) === key);
          return <label className="offering-mode-option" key={key}><input type="checkbox" aria-label={`${annualLevelName(curriculum.id)} · ${mode || 'Mode non renseigné'}`} checked={isSelected} onChange={event => setAnnualVariants(items => event.target.checked ? [...items, variant] : items.filter(item => offeringVariantKey(item) !== key))} /> <span>{mode || 'Mode standard'}</span></label>;
        })}</div></div>)}</div>{form.program_id && !annualCurricula.length && <p className="cell-sub">Aucun niveau enregistré pour cette filière. Utilisez « Définir ses niveaux ici » pour les ajouter sans quitter la préparation.</p>}</fieldset></>}
        {collection === 'programs' && dialog !== 'archive' && !sourceRowId && <fieldset className="offering-levels-box"><legend>Niveaux disponibles dans cette filière</legend><p className="cell-sub" style={{ margin: '0 0 10px' }}>Cochez ou décochez les niveaux. Un niveau déjà utilisé ne peut pas être retiré.</p>{canEdit && <button type="button" className="btn btn-outline" style={{ marginBottom: '12px' }} onClick={() => beginInline('levels')}>Créer un niveau ici</button>}<div className="offering-modes-grid">{(data.tables.levels || []).filter(level => !level.archived_at && level.active !== false).map(level => <label className="offering-mode-option" key={level.id}><input type="checkbox" checked={(form.level_ids || '').split(',').includes(level.id)} onChange={event => setForm(current => ({ ...current, level_ids: (event.target.checked ? [...(current.level_ids || '').split(',').filter(Boolean), level.id] : (current.level_ids || '').split(',').filter(id => id !== level.id)).join(',') }))} /> <span>{String(level.name)}</span></label>)}</div>{!data.tables.levels?.length && <p className="cell-sub">Aucun niveau n’est encore enregistré. Vous pourrez les ajouter à cette filière après leur création.</p>}</fieldset>}
        {creatingGroup && <fieldset className="offering-levels-box"><legend>Filières accueillies dans ce groupe</legend><p className="cell-sub" style={{ margin: '0 0 10px' }}>Choisissez une ou plusieurs formations du niveau sélectionné.</p><div className="offering-modes-grid">{groupChoices.map(row => <label className="offering-mode-option" key={row.id}><input type="checkbox" checked={offeringIds.includes(row.id)} onChange={event => setOfferingSelection(event.target.checked ? [...offeringIds, row.id] : offeringIds.filter(id => id !== row.id))} /> <span>{String(row.name)}</span></label>)}</div>{!groupChoices.length && <p className="cell-sub">Aucune formation proposée pour ce niveau dans cette année. Configurez les formations proposées avant de créer le groupe.</p>}</fieldset>}
        <label className="form-group">Motif<textarea className="input" required minLength={3} maxLength={1000} value={reason} onChange={event => setReason(event.target.value)} /></label><DrawerActions><button className="btn btn-primary" aria-label={preparingFinancialSettings || creatingOfferings || creatingGroup ? submitLabel : 'Vérifier les informations'} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg><span>{submitLabel}</span></button></DrawerActions>
      </fieldset></ReviewedForm>}
    </Editor>}
  </div>;
}
