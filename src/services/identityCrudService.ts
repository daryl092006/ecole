import { ROLES } from '@/types/permissions';
import { z } from 'zod';
import type { PersistentChange, PersistentContext, RelationalSnapshot } from '@/types/persistence';
export const personFormSchema = z.object({ firstname:z.string().trim().min(1).max(160), lastname:z.string().trim().min(1).max(160), email:z.union([z.email(),z.literal('')]), phone:z.string().trim().max(80), gender:z.string().max(40), birthDate:z.union([z.iso.date(),z.literal('')]), nationality:z.string().max(160), address:z.string().max(1000), city:z.string().max(160), country:z.string().max(160) }).strict().refine(form=>!form.birthDate || form.birthDate<=new Date().toISOString().slice(0,10),{message:'La date de naissance ne peut pas être dans le futur.'});
export function personValues(form: z.infer<typeof personFormSchema>) {
  return { firstname:form.firstname, lastname:form.lastname, email:form.email || null, phone:form.phone || null, gender:form.gender || null, birth_date:form.birthDate || null, nationality:form.nationality || null, address:form.address || null, city:form.city || null, country:form.country || null };
}
export function identityArchiveChanges(context: PersistentContext, snapshot: RelationalSnapshot, kind:'students'|'staff', personId:string, reason:string, now=new Date()): PersistentChange[] {
  if (!context.grants.some(g=>!g.site_id && !g.group_id && !g.academic_year_id)) throw new Error('L’archivage nécessite un accès global.');
  if (personId===context.personId) throw new Error('Vous ne pouvez pas archiver votre propre dossier.');
  const opposite=kind==='students'?'staff':'students';
  if (snapshot.tables[opposite]?.some(row=>row.person_id===personId && !row.archived_at)) throw new Error('Cette personne possède aussi un dossier dans une autre catégorie. Gérez séparément ses statuts et ses accès.');
  const entity=snapshot.tables[kind]?.find(row=>row.person_id===personId && !row.archived_at);
  const accounts=(snapshot.tables.accounts || []).filter(row=>row.person_id===personId && !row.archived_at);
  if (accounts.length && (!context.permissions.includes('user.manage') || ![ROLES.IT,ROLES.DG].includes(context.role as typeof ROLES.IT))) throw new Error('L’archivage de ce dossier nécessite aussi le droit de révoquer son compte de connexion.');
  const timestamp=now.toISOString();
  const changes: PersistentChange[]=entity?[{table:kind,operation:'update',record:{id:entity.id,archived_at:timestamp,reason}}]:[];
  for (const account of accounts) {
    changes.push({table:'accounts',operation:'update',record:{id:account.id,active:false,archived_at:timestamp,reason,last_modified_by:context.accountId}});
    for (const grant of snapshot.tables.role_grants || []) if(grant.account_id===account.id && String(grant.valid_from)<=timestamp && (!grant.valid_until || String(grant.valid_until)>timestamp)) changes.push({table:'role_grants',operation:'update',record:{id:grant.id,valid_until:new Date(Math.max(now.getTime(),new Date(String(grant.valid_from)).getTime()+1)).toISOString(),reason}});
  }
  if (!changes.length) throw new Error('Dossier introuvable ou déjà archivé.');
  return changes;
}
