import {connectedRecordName} from '@/services/connectedRecordDisplayService';
import { resolveAcademicYear } from '@/server/academicYearContext';
import { filterSnapshotForAcademicYear } from '@/services/academicYearScopeService';
import { errorResponse } from '@/server/auth';
import { catalogRequest, writeCatalog } from '@/server/catalogCrud';
import { filterRelationalSnapshot } from '@/services/persistentPermissionsService';
import { ROLES } from '@/types/permissions';
import { CRUD_CATALOG, HISTORY_CRUD_TABLES } from '@/data/crudCatalog';
export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ collection: string }> };
export async function GET(request: Request, { params }: Context) {
  try {
    const key = (await params).collection;
    const { snapshot, context, client } = await catalogRequest(request,key);
    const dependencies = CRUD_CATALOG.find(spec => spec.key === key)!.fields.flatMap(field => field.reference ? [field.reference] : []);
    const year = ['groups','subjects','annual_fee_schedules','annual_payment_channels','academic_offerings','group_offerings','curricula','curriculum_semesters','teaching_units','curriculum_components'].includes(key) ? await resolveAcademicYear(request,client,context,snapshot) : null;
    const scoped=filterSnapshotForAcademicYear(filterRelationalSnapshot(snapshot,context),year ? year.selectedYearId || (year.selection === 'all' ? null : '00000000-0000-0000-0000-000000000000') : null);
    const restricted=[ROLES.ENS,ROLES.SURV,ROLES.STUD,ROLES.DEL].includes(context.role as typeof ROLES.ENS);
    const tables = Object.fromEntries([...new Set([key,...dependencies])].map(name => [name, name===key || restricted ? scoped.tables[name] || [] : ((['subjects','groups','academic_offerings'].includes(name) ? scoped.tables[name] : snapshot.tables[name]) || []).map(row=>({id:row.id,name:connectedRecordName(name,row,snapshot),code:row.code,site_id:row.site_id,level_id:row.level_id,curriculum_id:row.curriculum_id,academic_year_id:row.academic_year_id,semester_id:row.semester_id,program_id:row.program_id,version:row.version,archived_at:row.archived_at,active:row.active,status:row.status}))]));
    if (key === 'groups') {
      tables.group_offerings = scoped.tables.group_offerings || [];
      tables.academic_offerings = (scoped.tables.academic_offerings || []).map(row => {
        const curriculum = snapshot.tables.curricula?.find(item => item.id === row.curriculum_id);
        const program = snapshot.tables.programs?.find(item => item.id === curriculum?.program_id);
        return { ...row, program_id: program?.id || null, name: [program?.name || 'Filière non renseignée', row.delivery_mode].filter(Boolean).join(' · ') };
      });
    }
    if (key === 'programs') {
      tables.levels = (snapshot.tables.levels || []).filter(row => !row.archived_at && row.active !== false);
      tables.programs = (tables.programs || []).map(row => ({ ...row, level_ids: [...new Set((snapshot.tables.curricula || []).filter(curriculum => curriculum.program_id === row.id && !curriculum.archived_at && curriculum.status !== 'ARCHIVED').map(curriculum => curriculum.level_id))] }));
    }
    if (key === 'subjects') {
      for (const table of ['curriculum_semesters', 'curricula', 'levels', 'cycles', 'teaching_units']) tables[table] = scoped.tables[table] || [];
      // Keep all subject codes of the selected year reserved, including archived ones.
      tables.subjects = scoped.tables.subjects || [];
    }
    if (key === 'academic_offerings') tables.programs = (snapshot.tables.programs || []).map(row => ({ id: row.id, name: row.name, archived_at: row.archived_at, active: row.active }));
    let historyLinks:{sourceRowId:string;targetId:string}[]=[];
    if(Object.values(HISTORY_CRUD_TABLES).includes(key) && [ROLES.IT,ROLES.DG].includes(context.role as typeof ROLES.IT)){const links=await client.rpc('escen_catalog_history_links',{p_table:key});if(links.error)throw new Error('Provenance indisponible.');historyLinks=links.data || [];}
    return Response.json({revision:snapshot.revision,tables,historyLinks},{headers:{'Cache-Control':'no-store'}});
  } catch(error) { return errorResponse(error); }
}
export async function POST(request: Request, { params }: Context) { try { return await writeCatalog(request,(await params).collection); } catch(error) { return errorResponse(error); } }
