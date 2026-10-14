import type { Permission } from '@/types/permissions';
export interface CrudField { key: string; label: string; type: 'text' | 'textarea' | 'number' | 'date' | 'reference' | 'select' | 'email'; required?: boolean; reference?: string; min?: number; options?: {value:string;label:string}[]; }
export interface CrudCollection { key: string; title: string; singular: string; read: Permission; write: Permission; fields: CrudField[]; }
const identity: CrudField[] = [{ key: 'code', label: 'Code', type: 'text', required: true }, { key: 'name', label: 'Nom', type: 'text', required: true }];
const reference = (key: string, label: string, target: string): CrudField => ({ key, label, type: 'reference', reference: target, required: true });
const academic = { read: 'academic.view' as Permission, write: 'academic.structure.manage' as Permission };
export const CRUD_CATALOG: CrudCollection[] = [
  { key: 'programs', title: 'Filières', singular: 'une filière', ...academic, fields: [...identity, { key: 'description', label: 'Description', type: 'textarea' }] },
  { key: 'tracks', title: 'Parcours', singular: 'un parcours', ...academic, fields: [...identity, reference('program_id','Filière','programs')] },
  { key: 'subjects', title: 'Matières', singular: 'une matière', ...academic, fields: identity },
  { key: 'cycles', title: 'Cycles', singular: 'un cycle', ...academic, fields: identity },
  { key: 'levels', title: 'Niveaux', singular: 'un niveau', ...academic, fields: [...identity, reference('cycle_id','Cycle','cycles'), { key: 'position', label: 'Ordre dans le cycle', type: 'number', min: 1, required: true }] },
  { key: 'academic_years', title: 'Années universitaires', singular: 'une année universitaire', ...academic, fields: [...identity, { key: 'starts_on', label: 'Date de début', type: 'date', required: true }, { key: 'ends_on', label: 'Date de fin', type: 'date', required: true }] },
  { key: 'sites', title: 'Sites', singular: 'un site', ...academic, fields: [...identity, { key: 'address', label: 'Adresse', type: 'textarea' }] },
  { key: 'buildings', title: 'Bâtiments', singular: 'un bâtiment', ...academic, fields: [...identity, reference('site_id','Site','sites')] },
  { key: 'rooms', title: 'Salles', singular: 'une salle', read: 'schedule.view', write: 'academic.structure.manage', fields: [...identity, reference('site_id','Site','sites'), reference('building_id','Bâtiment','buildings'), { key: 'capacity', label: 'Capacité', type: 'number', min: 1, required: true }] },
  { key: 'assets', title: 'Inventaire', singular: 'un équipement', read:'asset.view', write:'asset.manage', fields:[...identity,reference('site_id','Site','sites'),{key:'location',label:'Localisation',type:'text'},{key:'status',label:'État',type:'select',required:true,options:[{value:'DISPONIBLE',label:'Disponible'},{value:'MAINTENANCE',label:'En maintenance'},{value:'HORS_SERVICE',label:'Hors service'}]}] },
  { key: 'suppliers', title:'Fournisseurs',singular:'un fournisseur',read:'purchase.view',write:'purchase.create',fields:[{key:'name',label:'Nom',type:'text',required:true},{key:'tax_identifier',label:'Identifiant fiscal',type:'text'},{key:'email',label:'Email',type:'email'},{key:'phone',label:'Téléphone',type:'text'}] },
  { key: 'groups', title: 'Groupes', singular: 'un groupe', read: 'academic.view', write: 'academic.group.manage', fields: [{ key: 'name', label: 'Nom', type: 'text', required: true }, reference('academic_year_id','Année universitaire','academic_years'), reference('level_id','Niveau','levels'), reference('site_id','Site','sites')] },
];
export const CRUD_SECTIONS: Record<string,string[]> = { acad_program: ['programs','tracks','subjects'], acad_reference: ['academic_years','cycles','levels','groups','sites','buildings','rooms'], log_assets:['assets'], log_suppliers:['suppliers'] };

export const HISTORY_CRUD_TABLES: Record<string,string> = { filieres:'programs', matieres:'subjects', annee_scolaires:'academic_years', niveaux:'levels', groups:'groups', salles:'rooms' };
export const HISTORY_CRUD_FIELDS: Record<string,string> = { name:'nom', starts_on:'date_debut', ends_on:'date_fin', position:'ordre', capacity:'effectif' };
