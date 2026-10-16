import { z } from 'zod';
import { academicYearRequestHeaders } from './academicYearSelection';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { RoleName } from '@/types/permissions';
import type { RelationalSnapshot, PersistentChange } from '@/types/persistence';

async function headers(role?: RoleName, useResolvedYear = true) {
  const session = await getSupabaseBrowserClient().auth.getSession();
  if (!session.data.session) throw new Error('Connexion requise.');
  return { ...academicYearRequestHeaders(useResolvedYear), Authorization: `Bearer ${session.data.session.access_token}`, ...(role ? { 'x-escen-role': role } : {}) };
}
async function readResponse(response: Response) {
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Service temporairement indisponible.');
  return data;
}
const snapshotSchema = z.object({
  revision: z.number().int().nonnegative(),
  tables: z.record(z.string(), z.array(z.object({ id: z.string().min(1) }).passthrough())),
  academicContext: z.object({currentYearId:z.string().nullable(),currentYearConfigured:z.boolean().optional(),selectedYearId:z.string().nullable(),selection:z.string(),years:z.array(z.object({id:z.string(),name:z.string(),status:z.enum(['BROUILLON','OUVERTE','EN_CLOTURE','CLOTUREE']),starts_on:z.string(),ends_on:z.string()}))}).optional(),
});
export async function loadRelationalCampus(role?: RoleName, signal?: AbortSignal): Promise<RelationalSnapshot> {
  const response = await readResponse(await fetch('/api/campus', { headers: await headers(role, false), cache: 'no-store', signal }));
  const result = snapshotSchema.safeParse(response);
  if (!result.success) throw new Error('Les dossiers reçus sont incomplets. Réessayez le chargement.');
  return result.data;
}

export async function saveRelationalChanges(revision: number, changes: PersistentChange[], role?: RoleName): Promise<number> {
  const data = await readResponse(await fetch('/api/campus',{ method:'POST',headers:{ ...await headers(role),'Content-Type':'application/json' },body:JSON.stringify({ revision,changes }) }));
  return data.revision;
}
export async function loadAccountSession(role?: RoleName) {
  return readResponse(await fetch('/api/session',{ headers:await headers(role),cache:'no-store' }));
}
export async function updatePersistentAccount(id: string, values: { action: 'activate' | 'deactivate' | 'archive' | 'role'; reason: string; role?: RoleName; previousRole?: RoleName | null }, role: RoleName): Promise<void> {
  await readResponse(await fetch(`/api/accounts/${encodeURIComponent(id)}`, { method: 'PATCH', headers: { ...await headers(role), 'Content-Type': 'application/json' }, body: JSON.stringify(values) }));
}
export async function saveStudentProfile(matricule: string, values: Record<string, string>, role: RoleName, revision:number): Promise<void> {
  await readResponse(await fetch(`/api/students/${encodeURIComponent(matricule)}`, { method: 'PATCH', headers: { ...await headers(role), 'Content-Type': 'application/json' }, body: JSON.stringify({...values,revision}) }));
}

export async function loadPersonnel(role: RoleName, signal?: AbortSignal): Promise<{ records: import('@/types/staff').PersonnelRecord[]; revision: number }> {
  const data = await readResponse(await fetch('/api/staff', { headers: await headers(role), cache: 'no-store', signal }));
  return data;
}
export async function createPersonnel(values: import('@/types/staff').PersonnelForm, role: RoleName): Promise<void> {
  await readResponse(await fetch('/api/staff', { method: 'POST', headers: { ...await headers(role), 'Content-Type': 'application/json' }, body: JSON.stringify(values) }));
}

export async function loadCatalog(collection: string, role: RoleName, signal?: AbortSignal, yearId?: string): Promise<import('@/types/persistence').CatalogSnapshot> {
  return readResponse(await fetch(`/api/catalog/${encodeURIComponent(collection)}`, { headers: { ...await headers(role), ...(yearId ? { 'x-escen-year': yearId } : {}) }, cache: 'no-store', signal }));
}
export async function mutateCatalog(collection: string, values: { revision: number; values?: Record<string,unknown>; reason: string; sourceRowId?:string }, role: RoleName, id?: string, archive = false, yearId?: string): Promise<{ id?: string; revision: number }> {
  return readResponse(await fetch(`/api/catalog/${encodeURIComponent(collection)}${id ? `/${encodeURIComponent(id)}` : ''}`, { method: archive ? 'DELETE' : id ? 'PATCH' : 'POST', headers: { ...await headers(role), ...(yearId ? { 'x-escen-year': yearId } : {}), 'Content-Type':'application/json' }, body: JSON.stringify(values) }));
}

export async function updatePersonnel(personId: string, values: import('@/types/staff').PersonnelForm & {revision:number;reason:string}, role:RoleName):Promise<void> {
  const {personId: ignored, ...body}=values;
  void ignored;
  await readResponse(await fetch(`/api/staff/${encodeURIComponent(personId)}`,{method:'PATCH',headers:{...await headers(role),'Content-Type':'application/json'},body:JSON.stringify(body)}));
}
export async function archivePersonnel(personId:string, revision:number, reason:string, role:RoleName):Promise<void> {
  await readResponse(await fetch(`/api/staff/${encodeURIComponent(personId)}`,{method:'DELETE',headers:{...await headers(role),'Content-Type':'application/json'},body:JSON.stringify({revision,reason})}));
}
export async function createStudentRecord(matricule:string, person:Record<string,string>,role:RoleName):Promise<{matricule:string}> {
  return readResponse(await fetch('/api/students',{method:'POST',headers:{...await headers(role),'Content-Type':'application/json'},body:JSON.stringify({matricule,person})}));
}
export async function archiveStudentRecord(matricule:string, reason:string, role:RoleName):Promise<void> {
  await readResponse(await fetch(`/api/students/${encodeURIComponent(matricule)}`,{method:'DELETE',headers:{...await headers(role),'Content-Type':'application/json'},body:JSON.stringify({reason})}));
}

export async function loadPreparedSubjects(role:RoleName,signal?:AbortSignal):Promise<import('@/types/subject').SubjectDirectory> {
  return readResponse(await fetch('/api/subjects',{headers:await headers(role),cache:'no-store',signal}));
}
export async function savePreparedSubject(subject:import('@/types/subject').SubjectInput,revision:number,reason:string,role:RoleName,previousId?:string):Promise<{id:string}> {
  return readResponse(await fetch('/api/subjects',{method:'POST',headers:{...await headers(role),'Content-Type':'application/json'},body:JSON.stringify({subject,revision,reason,...(previousId?{previousId}:{})})}));
}

export async function loadWebsiteData<T>(kind: 'articles' | 'admissions', role: RoleName, signal?: AbortSignal): Promise<T> {
  return readResponse(await fetch(`/api/website-management?kind=${kind}`, { headers: await headers(role), cache: 'no-store', signal }));
}
export async function saveWebsiteData(values: Record<string, unknown>, role: RoleName): Promise<void> {
  await readResponse(await fetch('/api/website-management', { method: 'POST', headers: { ...await headers(role), 'Content-Type': 'application/json' }, body: JSON.stringify(values) }));
}
export async function downloadApplicationDocument(id: string, role: RoleName): Promise<string> {
  const result = await readResponse(await fetch(`/api/website-management?kind=document&id=${encodeURIComponent(id)}`, { headers: await headers(role), cache: 'no-store' }));
  return result.url;
}

export async function changeAcademicYear(values: { action: 'current' | 'transition'; yearId: string | null; status?: string; revision: number; reason: string }, role: RoleName): Promise<{ revision: number }> {
  return await readResponse(await fetch('/api/academic-years', {method:'POST',headers:{...await headers(role),'Content-Type':'application/json'},body:JSON.stringify(values)}));
}

export async function loadYearClosureReview(yearId: string, role: RoleName, signal?: AbortSignal): Promise<import('@/services/academicYearClosureService').YearClosureReview> {
  return readResponse(await fetch(`/api/academic-years?yearId=${encodeURIComponent(yearId)}`, { headers: await headers(role), cache: 'no-store', signal }));
}

export async function loadReenrollmentCandidates(role: RoleName, signal?: AbortSignal): Promise<import('@/services/reenrollmentService').ReenrollmentDirectory> {
  return readResponse(await fetch('/api/reenrollments',{headers:await headers(role),cache:'no-store',signal}));
}

export async function loadStudentRecord(matricule: string, role: RoleName, signal?: AbortSignal): Promise<{student: import('@/types/student').Student}> {
  return readResponse(await fetch(`/api/students/${encodeURIComponent(matricule)}`,{headers:await headers(role),cache:'no-store',signal}));
}
export async function studentOperations(matricule:string,role:RoleName,body?:Record<string,unknown>,signal?:AbortSignal) {
  return readResponse(await fetch(`/api/students/${encodeURIComponent(matricule)}/operations`,{method:body?'POST':'GET',headers:{...await headers(role),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),cache:'no-store',signal}));
}
export async function loadYearPreparation(yearId:string,role:RoleName,signal?:AbortSignal):Promise<{checks:import('@/services/yearPreparationService').YearPreparationCheck[];ready:boolean;previousYear?:{id:string;name:string}|null;previousSummary?:import('@/services/yearPreparationService').ReconductConfigSummary|null}>{
 return readResponse(await fetch('/api/year-preparation',{headers:{...await headers(role),'x-escen-year':yearId},cache:'no-store',signal}));
}
export async function reconductYearPreparation(values:{targetYearId:string;previousYearId:string;revision:number;reason:string;step?:string},role:RoleName):Promise<{revision:number;count:number}>{
 return readResponse(await fetch('/api/year-preparation',{method:'POST',headers:{...await headers(role),'Content-Type':'application/json'},body:JSON.stringify({action:'reconduct_previous_year',...values})}));
}
export async function enrollmentOperation(role:RoleName,body?:Record<string,unknown>,signal?:AbortSignal){
 return readResponse(await fetch('/api/enrollments',{method:body?'POST':'GET',headers:{...await headers(role),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),signal,cache:'no-store'}));
}


export async function loadWebsiteBrochures(role: RoleName, signal?: AbortSignal): Promise<import('@/types/website').WebsiteBrochure[]> {
  return readResponse(await fetch('/api/website-brochures', { headers: await headers(role), cache: 'no-store', signal }));
}
export async function saveWebsiteBrochure(metadata: Record<string, unknown>, file: File | null, role: RoleName): Promise<void> {
  const body = new FormData();
  body.set('metadata', JSON.stringify(metadata));
  if (file) body.set('file', file);
  await readResponse(await fetch('/api/website-brochures', { method: 'POST', headers: await headers(role), body }));
}
