import { z } from 'zod';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { RoleName } from '@/types/permissions';
import type { RelationalSnapshot, PersistentChange } from '@/types/persistence';

async function headers(role?: RoleName) {
  const session = await getSupabaseBrowserClient().auth.getSession();
  if (!session.data.session) throw new Error('Connexion requise.');
  return { Authorization: `Bearer ${session.data.session.access_token}`, ...(role ? { 'x-escen-role': role } : {}) };
}
async function readResponse(response: Response) {
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Service temporairement indisponible.');
  return data;
}
const snapshotSchema = z.object({
  revision: z.number().int().nonnegative(),
  tables: z.record(z.string(), z.array(z.object({ id: z.string().min(1) }).passthrough())),
});
export async function loadRelationalCampus(role?: RoleName, signal?: AbortSignal): Promise<RelationalSnapshot> {
  const response = await readResponse(await fetch('/api/campus', { headers: await headers(role), cache: 'no-store', signal }));
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

export async function loadCatalog(collection: string, role: RoleName, signal?: AbortSignal): Promise<import('@/types/persistence').CatalogSnapshot> {
  return readResponse(await fetch(`/api/catalog/${encodeURIComponent(collection)}`, { headers: await headers(role), cache: 'no-store', signal }));
}
export async function mutateCatalog(collection: string, values: { revision: number; values?: Record<string,unknown>; reason: string; sourceRowId?:string }, role: RoleName, id?: string, archive = false): Promise<void> {
  await readResponse(await fetch(`/api/catalog/${encodeURIComponent(collection)}${id ? `/${encodeURIComponent(id)}` : ''}`, { method: archive ? 'DELETE' : id ? 'PATCH' : 'POST', headers: { ...await headers(role), 'Content-Type':'application/json' }, body: JSON.stringify(values) }));
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
