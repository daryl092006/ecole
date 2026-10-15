import {requireAccount,RequestError,errorResponse,requirePermission} from '@/server/auth';
import {resolveAcademicYear} from '@/server/academicYearContext';
import {yearPreparation,buildReconductChanges,getPreviousYearConfigSummary} from '@/services/yearPreparationService';
import {previousAcademicYear} from '@/services/reenrollmentService';
import type {DatabaseRow} from '@/types/persistence';
import {z} from 'zod';

export const dynamic='force-dynamic';

export async function GET(request:Request){try{
  const {client,context}=await requireAccount(request);
  if(!context.permissions.some(permission=>['academic.view','finance.view'].includes(permission)) || !context.grants.some(grant=>!grant.site_id && !grant.group_id && !grant.academic_year_id))throw new RequestError(403,'La préparation nécessite un accès global autorisé.');
  const result=await client.rpc('escen_backend_snapshot');if(result.error)throw new RequestError(503,'Configuration indisponible.');
  const year=await resolveAcademicYear(request,client,context,result.data);
  if(!year.selectedYearId)throw new RequestError(409,'Choisissez l’année à préparer.');
  const checks=yearPreparation(result.data,year.selectedYearId);
  const targetYear = (result.data.tables.academic_years || []).find((y: DatabaseRow) => y.id === year.selectedYearId);
  let previousYear = targetYear ? previousAcademicYear(result.data.tables.academic_years || [], targetYear) : null;
  if (!previousYear && targetYear) {
    const allYears = (result.data.tables.academic_years || []).filter((y: DatabaseRow) => !y.archived_at && y.id !== targetYear.id);
    const targetMatch = (String(targetYear.name || '') + ' ' + String(targetYear.code || '')).match(/(\d{4})[^\d]+(\d{4})/);
    if (targetMatch) {
      const prevStart = Number(targetMatch[1]) - 1;
      previousYear = allYears.find((y: DatabaseRow) => String(y.name || '').includes(String(prevStart)) || String(y.code || '').includes(String(prevStart))) || null;
    }
    if (!previousYear && allYears.length) {
      const sorted = [...allYears].sort((a: DatabaseRow, b: DatabaseRow) => String(b.starts_on || '').localeCompare(String(a.starts_on || '')));
      previousYear = sorted[0] || null;
    }
  }
  const previousSummary = previousYear ? getPreviousYearConfigSummary(result.data, previousYear.id) : null;
  return Response.json({
    checks,
    ready:checks.every(check=>check.ready),
    previousYear: previousYear ? { id: previousYear.id, name: String(previousYear.name) } : null,
    previousSummary,
  },{headers:{'Cache-Control':'no-store'}});
}catch(error){return errorResponse(error);}}

export async function POST(request: Request) {
  try {
    const {client, context} = await requireAccount(request);
    requirePermission(context, 'academic.year.open');
    if (!context.grants.some(grant => !grant.site_id && !grant.group_id && !grant.academic_year_id)) {
      throw new RequestError(403, 'Un accès global au pilotage des années est requis.');
    }
    const body = z.object({
      action: z.literal('reconduct_previous_year'),
      targetYearId: z.string().uuid(),
      previousYearId: z.string().uuid(),
      revision: z.number().int().nonnegative(),
      reason: z.string().trim().min(3).max(1000),
      step: z.enum(['offerings', 'groups', 'tuition', 'registration', 'payments']).optional(),
    }).strict().parse(await request.json());

    const result = await client.rpc('escen_backend_snapshot');
    if (result.error) throw new RequestError(503, 'Configuration indisponible.');
    const snapshot = result.data;
    if (body.revision !== snapshot.revision) throw new RequestError(409, 'Ces données ont changé. Actualisez avant de réessayer.');

    const targetYear = (snapshot.tables.academic_years || []).find((y: DatabaseRow) => y.id === body.targetYearId && !y.archived_at);
    if (!targetYear) throw new RequestError(404, 'Année cible introuvable.');
    if (!['BROUILLON', 'OUVERTE'].includes(targetYear.status)) throw new RequestError(409, 'L’année cible doit être en préparation ou ouverte.');

    const previousYear = (snapshot.tables.academic_years || []).find((y: DatabaseRow) => y.id === body.previousYearId && !y.archived_at);
    if (!previousYear) throw new RequestError(404, 'Année précédente introuvable.');

    const changes = buildReconductChanges(snapshot, body.previousYearId, body.targetYearId, body.reason, body.step);
    if (!changes.length) throw new RequestError(400, 'Aucun paramètre à reconduire pour cette étape depuis l’année précédente.');

    let currentRevision = snapshot.revision;
    for (let i = 0; i < changes.length; i += 100) {
      const chunk = changes.slice(i, i + 100);
      const res = await client.rpc('escen_backend_transaction', {
        p_actor_id: context.accountId,
        p_expected_revision: currentRevision,
        p_changes: chunk,
      });
      if (res.error) throw new RequestError(409, 'Enregistrement refusé : conflit de configuration ou modification concurrente.');
      currentRevision = res.data;
    }

    return Response.json({ revision: currentRevision, count: changes.length }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return errorResponse(error);
  }
}

