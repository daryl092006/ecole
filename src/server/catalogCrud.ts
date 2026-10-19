import 'server-only';
import { resolveAcademicYear } from './academicYearContext';
import { z } from 'zod';
import { requireAccount, requirePermission, RequestError } from '@/server/auth';
import { ROLES } from '@/types/permissions';
import { CRUD_CATALOG } from '@/data/crudCatalog';
import { catalogSpec, parseCatalogRecord, canManageCatalog, validateCatalogReferences, programLevelChanges } from '@/services/catalogCrudService';
import { buildReconductChanges } from '@/services/yearPreparationService';
import { annualOfferingChanges, archiveAnnualOfferings } from '@/services/annualOfferingService';
import type { RelationalSnapshot, PersistentChange } from '@/types/persistence';
const curriculumArchiveErrors = new Set([
  'Archivage interdit : la maquette est approuvée ou archivée. Le gel de la maquette prime.',
  'Archivage du semestre interdit : des unités d’enseignement actives y sont encore rattachées.',
  'Archivage de l’unité d’enseignement interdit : des matières actives y sont encore rattachées.',
]);
export async function catalogRequest(request: Request, key: string) {
  if (!CRUD_CATALOG.some(spec => spec.key === key)) throw new RequestError(404,'Collection inconnue.');
  const account = await requireAccount(request); const spec = catalogSpec(key);
  requirePermission(account.context,spec.read);
  if (!account.context.grants.some(g => !g.site_id && !g.group_id && !g.academic_year_id)) throw new RequestError(403,'La gestion du référentiel nécessite un accès global.');
  const response = await account.client.rpc('escen_backend_snapshot');
  if (response.error) throw new RequestError(503,'Chargement du référentiel indisponible.');
  return { ...account, snapshot: response.data as RelationalSnapshot, spec };
}
export async function writeCatalog(request: Request, key: string, id?: string) {
  const { client, context, snapshot } = await catalogRequest(request,key);
  if (!canManageCatalog(context,key)) throw new RequestError(403,'Vous ne pouvez pas modifier ce référentiel.');
  const archive = request.method === 'DELETE';
  const body = z.object({ revision: z.number().int().nonnegative(), values: z.record(z.string(),z.unknown()).optional(), reason: z.string().trim().min(3).max(1000), sourceRowId:z.uuid().optional() }).strict().parse(await request.json());
  if (body.revision !== snapshot.revision) throw new RequestError(409,'Ces données ont changé. Actualisez avant de réessayer.');
  const target = id ? snapshot.tables[key]?.find(row => row.id === z.uuid().parse(id)) : undefined;
  if (id && !target) throw new RequestError(404,'Enregistrement introuvable.');
  if (target?.archived_at) throw new RequestError(409,'Cet enregistrement est archivé.');
  if (key === 'academic_offerings' && !id && !archive && body.values?.archive_ids !== undefined) {
    if (body.sourceRowId) throw new RequestError(400, 'Reprise historique incompatible avec un retrait.');
    const values = z.object({ academic_year_id: z.uuid(), archive_ids: z.array(z.uuid()).min(1).max(100) }).strict().parse(body.values);
    const year = await resolveAcademicYear(request, client, context, snapshot);
    if (year.selectedYearId !== values.academic_year_id) throw new RequestError(409, 'Choisissez l’année précise à préparer.');
    let changes: PersistentChange[];
    try { changes = archiveAnnualOfferings(snapshot, values.academic_year_id, values.archive_ids, body.reason); }
    catch (error) { throw new RequestError(409, error instanceof Error ? error.message : 'Retrait impossible.'); }
    const response = await client.rpc('escen_backend_transaction', { p_actor_id: context.accountId, p_expected_revision: snapshot.revision, p_changes: changes });
    if (response.error) throw new RequestError(409, 'Retrait refusé : relation incompatible ou modification concurrente. Aucune formation retirée.');
    return Response.json({ revision: response.data, count: changes.length }, { headers: { 'Cache-Control': 'no-store' } });
  }
  if (key === 'academic_offerings' && !id && !archive && body.values?.variants !== undefined) {
    if (body.sourceRowId) throw new RequestError(400, 'Cette opération ne remplace pas une reprise historique.');
    const values = z.object({ academic_year_id: z.uuid(), program_id: z.uuid(), variants: z.array(z.object({ curriculum_id: z.uuid(), delivery_mode: z.enum(['Présentiel', 'En ligne']).nullable() }).strict()).min(1).max(80) }).strict().parse(body.values);
    const year = await resolveAcademicYear(request, client, context, snapshot);
    if (!year.selectedYearId || year.selectedYearId !== values.academic_year_id) throw new RequestError(409, 'Choisissez l’année précise à préparer.');
    let changes: PersistentChange[];
    try { changes = annualOfferingChanges(snapshot, values.academic_year_id, values.program_id, values.variants, body.reason); }
    catch (error) { throw new RequestError(400, error instanceof Error ? error.message : 'Vérifiez les niveaux sélectionnés.'); }
    if (!changes.length) {
      return Response.json({ revision: snapshot.revision, count: 0, message: 'Ces niveaux et modes sont déjà enregistrés pour cette année.' }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
    }
    const response = await client.rpc('escen_backend_transaction', { p_actor_id: context.accountId, p_expected_revision: snapshot.revision, p_changes: changes });
    if (response.error) throw new RequestError(409, 'Enregistrement refusé : doublon, relation incompatible ou modification concurrente.');
    return Response.json({ revision: response.data, count: changes.length }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  }
  let levelIds: string[] = [];
  if (key === 'programs' && !archive && body.values?.level_ids !== undefined) {
    if (body.sourceRowId) throw new RequestError(400, 'Enregistrez la reprise de la filière avant d’ajouter ses niveaux.');
    levelIds = z.array(z.uuid()).max(50).parse(body.values.level_ids);
    if (new Set(levelIds).size !== levelIds.length) throw new RequestError(400, 'Un niveau ne peut être sélectionné qu’une fois.');
    for (const levelId of levelIds) {
      if (!snapshot.tables.levels?.some(row => row.id === levelId && !row.archived_at && row.active !== false)) throw new RequestError(400, 'Un niveau sélectionné est introuvable ou archivé.');
    }
    delete body.values.level_ids;
  }
  let offeringIds: string[] = [];
  if (key === 'groups' && !archive && !body.sourceRowId && (!id || body.values?.offering_ids !== undefined)) {
    offeringIds = z.array(z.uuid()).min(1).parse(body.values?.offering_ids);
    if (new Set(offeringIds).size !== offeringIds.length) throw new RequestError(400, 'Sélection de filières dupliquée.');
    const { offering_ids: _ids, ...values } = body.values!;
    void _ids;
    body.values = values;
    for (const offeringId of offeringIds) {
      const offering = snapshot.tables.academic_offerings?.find(row => row.id === offeringId && !row.archived_at);
      if (!offering || offering.academic_year_id !== values.academic_year_id || offering.level_id !== values.level_id) throw new RequestError(400, 'Choisissez des filières de la même année et du même niveau que le groupe.');
    }
  }
  let reconductYearId: string | undefined;
  if (key === 'academic_years' && !id && !archive && !body.sourceRowId && body.values?.reconduct_from_year_id) {
    reconductYearId = z.string().uuid().parse(body.values.reconduct_from_year_id);
    delete body.values.reconduct_from_year_id;
  }
  let record: Record<string,unknown>;
  if (archive) {
    if (!id) throw new RequestError(400,'Enregistrement requis.');
    record = { id, archived_at: new Date().toISOString(), reason: body.reason };
  } else {
    try { record = parseCatalogRecord(key,body.values); validateCatalogReferences(key,record,snapshot); }
    catch (error) { throw new RequestError(400,error instanceof z.ZodError ? 'Vérifiez les champs obligatoires et leur format.' : error instanceof Error ? error.message : 'Données invalides.'); }
    record = { ...record, id: id || crypto.randomUUID(), reason: body.reason };
    if (key === 'curricula') record.version = target?.version ?? 1;

  }
  if (['groups','subjects','annual_fee_schedules','annual_payment_channels','academic_offerings','group_offerings'].includes(key)) {
    const year = await resolveAcademicYear(request,client,context,snapshot);
    if (!year.selectedYearId) throw new RequestError(409,'Choisissez une année précise pour cette opération.');
    if (year.selectedYearId && (record.academic_year_id || target?.academic_year_id) !== year.selectedYearId) throw new RequestError(409, 'La définition doit appartenir à l’année consultée.');
  }
  const changes: PersistentChange[] = [{ table: key, operation: id ? 'update' : 'insert', record }];
  changes.push(...programLevelChanges(String(record.id), levelIds, snapshot, body.reason));
  if (offeringIds.length > 0) {
    const existingGroupOfferings = (snapshot.tables.group_offerings || []).filter(row => row.group_id === record.id);
    for (const link of existingGroupOfferings) {
      const wanted = offeringIds.includes(String(link.offering_id));
      if (!wanted && !link.archived_at) {
        changes.push({ table: 'group_offerings', operation: 'update', record: { id: link.id, archived_at: new Date().toISOString(), reason: body.reason } });
      } else if (wanted && link.archived_at) {
        changes.push({ table: 'group_offerings', operation: 'update', record: { id: link.id, archived_at: null, reason: body.reason } });
      }
    }
    for (const offeringId of offeringIds) {
      if (!existingGroupOfferings.some(link => link.offering_id === offeringId)) {
        changes.push({ table: 'group_offerings', operation: 'insert', record: { id: crypto.randomUUID(), group_id: record.id, offering_id: offeringId, academic_year_id: record.academic_year_id, level_id: record.level_id, reason: body.reason } });
      }
    }
  }
  if (reconductYearId) {
    const reconductChanges = buildReconductChanges(snapshot, reconductYearId, record.id as string, body.reason);
    changes.push(...reconductChanges);
  }
  let currentRevision = snapshot.revision;
  if (body.sourceRowId) {
    if (id || archive || ![ROLES.IT,ROLES.DG].includes(context.role as typeof ROLES.IT)) throw new RequestError(403,'Cette reprise nécessite un accès global de direction ou d’administration.');
    const response = await client.rpc('escen_catalog_resume',{p_actor_id:context.accountId,p_expected_revision:snapshot.revision,p_table:key,p_record:record,p_source_id:body.sourceRowId});
    if (response.error?.message.includes('Source déjà reprise')) throw new RequestError(409,'Ce dossier a déjà été repris. Modifiez son enregistrement dans le référentiel actuel.');
    if (response.error) throw new RequestError(409,'Enregistrement refusé : doublon, relation incompatible ou modification concurrente.');
    currentRevision = response.data;
  } else {
    for (let i = 0; i < changes.length; i += 100) {
      const chunk = changes.slice(i, i + 100);
      const response = await client.rpc('escen_backend_transaction', { p_actor_id: context.accountId, p_expected_revision: currentRevision, p_changes: chunk });
      if (response.error) {
        const knownArchiveError = archive && ['curriculum_semesters', 'teaching_units', 'curriculum_components'].includes(key)
          && response.error.code === '23514' && curriculumArchiveErrors.has(response.error.message);
        throw new RequestError(409, knownArchiveError ? response.error.message : 'Enregistrement refusé : doublon, relation incompatible ou modification concurrente.');
      }
      currentRevision = response.data;
    }
  }
  return Response.json({ id: record.id, revision: currentRevision },{status: id ? 200 : 201,headers:{'Cache-Control':'no-store'}});
}


