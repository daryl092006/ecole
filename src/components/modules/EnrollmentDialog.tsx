'use client';
import DrawerActions from '@/components/ui/DrawerActions';
import IconButton from '@/components/ui/IconButton';
import {useCallback,useEffect,useState} from 'react';
import {usePortal} from '@/hooks/usePortal';
import {enrollmentOperation} from '@/services/remoteCampusService';
import YearPreparationPanel from './academic/YearPreparationPanel';
import StudentCrudActions from './StudentCrudActions';
import DetailDrawer from '@/components/ui/DetailDrawer';
import ReviewedForm from '@/components/ui/ReviewedForm';
import LoadingState from '@/components/ui/LoadingState';
interface Directory {
 revision:number;
 candidates:{id:string;name:string;matricule:string;kind:string;eligible:boolean}[];
 offerings:{id:string;name:string;programId:string;levelId:string;deliveryMode?:string|null}[];
 groups:{id:string;offeringId:string;levelId?:string;name:string}[];
 fees:{id:string;category:string;amount:number;program_id:string|null;level_id:string|null;delivery_mode?:string|null}[];
}
function compatibleFees(directory:Directory|null,targetOffering:Directory['offerings'][number]|undefined,category:string){
 if(!directory || !targetOffering)return [];
 const list=directory.fees.filter(row=>row.category===category && (!row.program_id || row.program_id===targetOffering.programId) && (!row.level_id || row.level_id===targetOffering.levelId) && (!row.delivery_mode || row.delivery_mode===targetOffering.deliveryMode));
 const score=(fee:Directory['fees'][number])=>(fee.program_id===targetOffering.programId?4:0)+(fee.level_id===targetOffering.levelId?2:0)+(fee.delivery_mode && fee.delivery_mode===targetOffering.deliveryMode?1:0);
 return [...list].sort((a,b)=>score(b)-score(a));
}
function matchingGroupsForOffering(directory:Directory|null,nextOfferingId:string){
 if(!directory || !nextOfferingId)return [];
 const nextOffering=directory.offerings.find(row=>row.id===nextOfferingId);
 const direct=directory.groups.filter(row=>row.offeringId===nextOfferingId);
 if(direct.length)return direct;
 if(!nextOffering)return [];
 const byLevel=directory.groups.filter(row=>row.levelId && row.levelId===nextOffering.levelId);
 const seen=new Set<string>();
 return byLevel.filter(row=>{if(seen.has(row.id))return false;seen.add(row.id);return true;});
}
export default function EnrollmentDialog({kind,onClose,initialMatricule}:{kind:'new'|'reenroll'|'auto';onClose:()=>void;initialMatricule?:string}){
 const [configuration,setConfiguration]=useState<{root:string;category?:string}|null>(null);
 const [pendingMatricule,setPendingMatricule]=useState(initialMatricule || '');
 const portal=usePortal();const [data,setData]=useState<Directory|null>(null);const [error,setError]=useState('');const [busy,setBusy]=useState(false);const [retry,setRetry]=useState(0);
 const [studentId,setStudentId]=useState(''),[offeringId,setOfferingId]=useState(''),[groupId,setGroupId]=useState(''),[tuitionId,setTuitionId]=useState(''),[registrationId,setRegistrationId]=useState(''),[enrolledOn,setEnrolledOn]=useState(''),[reason,setReason]=useState('');
 const selectedYear=portal.academicYearContext?.years.find(year=>year.id===portal.academicYearContext?.selectedYearId);
 const applyOfferingSelection=useCallback((nextOfferingId:string,directory:Directory|null)=>{
  setOfferingId(nextOfferingId);
  if(!directory || !nextOfferingId){
   setGroupId('');setTuitionId('');setRegistrationId('');
   return;
  }
  const nextOffering=directory.offerings.find(row=>row.id===nextOfferingId);
  const groupsForLevel=matchingGroupsForOffering(directory,nextOfferingId);
  setGroupId(groupsForLevel[0]?.id || '');
  const tuitionChoices=compatibleFees(directory,nextOffering,'SCOLARITE');
  const registrationChoices=compatibleFees(directory,nextOffering,'INSCRIPTION');
  setTuitionId(tuitionChoices[0]?.id || '');
  setRegistrationId(registrationChoices[0]?.id || '');
  setEnrolledOn(prev=>{
   if(prev)return prev;
   const today=new Date().toISOString().slice(0,10);
   if(!selectedYear?.starts_on || !selectedYear?.ends_on)return today;
   if(today<selectedYear.starts_on)return selectedYear.starts_on;
   if(today>selectedYear.ends_on)return selectedYear.ends_on;
   return today;
  });
 },[selectedYear?.starts_on,selectedYear?.ends_on]);
 useEffect(()=>{const controller=new AbortController();setData(null);setError('');void enrollmentOperation(portal.activeRole,undefined,controller.signal).then(value=>{if(!controller.signal.aborted){setData(value);const created=value.candidates.find((row:Directory['candidates'][number])=>row.matricule===pendingMatricule);if(created)setStudentId(created.id);}}).catch(cause=>{if(!controller.signal.aborted)setError(cause.message);});return()=>controller.abort();},[portal.activeRole,retry,pendingMatricule,portal.academicYearSelection]);
 const matchedKind=data?.candidates.find(row=>row.matricule===initialMatricule)?.kind;
 const operationKind=kind==='auto'?(matchedKind==='new'||matchedKind==='reenroll'?matchedKind:undefined):kind;
 const offering=data?.offerings.find(row=>row.id===offeringId);const student=data?.candidates.find(row=>row.id===studentId);
 const availableGroups=matchingGroupsForOffering(data,offeringId);
 const fees=(category:string)=>compatibleFees(data,offering,category);
 const effectiveReason=reason.trim() || (operationKind==='new'?'Nouvelle inscription annuelle et affectation automatique au groupe':'Réinscription annuelle et affectation automatique au groupe');
 const ready=!!(operationKind && student?.eligible && offering && groupId && tuitionId && registrationId);
 const candidates=data?.candidates.filter(row=>row.kind===operationKind && (!initialMatricule || row.matricule===initialMatricule)) || [];
 const feeName=(id:string)=>{const fee=data?.fees.find(row=>row.id===id);return fee?`${fee.amount.toLocaleString('fr-FR')} FCFA`:'';};
 const selectedGroupName=availableGroups.find(row=>row.id===groupId)?.name || data?.groups.find(row=>row.id===groupId)?.name || '';
 const configure=(root:string,category?:string)=>setConfiguration({root,category});
 if(configuration && selectedYear)return <YearPreparationPanel yearId={selectedYear.id} yearName={selectedYear.name} onClose={()=>{setConfiguration(null);setRetry(value=>value+1);}} />;
 return <DetailDrawer title={operationKind==='new'?'Nouvelle inscription':'Réinscrire un ancien étudiant'} onClose={onClose}>{!data?error?<p role="alert">{error}<IconButton className="btn btn-outline" onClick={()=>setRetry(value=>value+1)} label="Réessayer" /></p>:<LoadingState label="Vérification des dossiers et des tarifs…" />:<><p>{operationKind==='new'?'Uniquement les dossiers sans inscription antérieure ni origine historique. Créez d’abord l’identité si elle n’existe pas.':'Choisissez simplement la formation de l’année : le groupe, les frais de scolarité, les frais d’inscription et la date sont sélectionnés automatiquement.'}</p>{operationKind==='new' && !initialMatricule && <StudentCrudActions onCreated={matricule=>{setPendingMatricule(matricule);setRetry(value=>value+1);}} />}{!candidates.length?<p>Aucun dossier correspondant à ce parcours.</p>:<ReviewedForm validate={()=>ready?null:'Choisissez le dossier, sa formation, son groupe et ses tarifs avant de continuer.'} busy={busy} error={error} confirmLabel={operationKind==='new'?'Confirmer la nouvelle inscription':'Confirmer la réinscription'} fields={[{label:'Étudiant',value:student?`${student.name} · ${student.matricule}`:''},{label:'Formation',value:offering?.name || ''},{label:'Groupe',value:selectedGroupName},{label:'Scolarité',value:feeName(tuitionId)},{label:'Inscription',value:feeName(registrationId)},{label:'Date',value:enrolledOn},{label:'Motif',value:effectiveReason}]} consequence="L’inscription, le groupe et un contrat en brouillon seront enregistrés ensemble. Les tarifs choisis seront conservés dans le contrat. Aucun paiement, reçu ou compte de connexion ne sera créé par cette opération." onConfirm={()=>{setBusy(true);setError('');void enrollmentOperation(portal.activeRole,{kind:operationKind,studentId,offeringId,groupId,tuitionId,registrationId,enrolledOn,reason:effectiveReason,revision:data.revision}).then(()=>{portal.reportActionOutcome({title:operationKind==='new'?'Nouvelle inscription enregistrée':'Réinscription enregistrée',detail:'L’inscription et le contrat en brouillon sont enregistrés. Vérifiez le contrat avant son approbation et le suivi financier.'});onClose();portal.refreshCampus();}).catch(cause=>setError(cause.message)).finally(()=>setBusy(false));}}>
 <label className="form-group">Étudiant<select className="select-input" required value={studentId} onChange={event=>{setStudentId(event.target.value);setOfferingId('');setGroupId('');setTuitionId('');setRegistrationId('');}}><option value="">Choisir le dossier</option>{candidates.map(row=><option key={row.id} value={row.id} disabled={!row.eligible}>{row.name} · {row.matricule}{!row.eligible?' · ancienne inscription à reprendre':''}</option>)}</select></label>
 {student?.eligible && <>{!data.offerings.length && portal.perms.permissions.includes('academic.structure.manage') && <button type="button" className="btn btn-outline" onClick={()=>configure('academic_offerings')}>Configurer l’année</button>}<label className="form-group">Formation de l’année<select className="select-input" required value={offeringId} onChange={event=>applyOfferingSelection(event.target.value,data)}><option value="">Choisir la formation</option>{data.offerings.map(row=><option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
 {offering && <>
  {ready && <div className="info-box" style={{marginBottom:'0.85rem',borderLeft:'4px solid var(--success, #15803d)'}}>
   <strong>Affectation automatique prête :</strong>
   <div style={{marginTop:'0.35rem',fontSize:'0.9rem'}}>
    • <strong>Groupe / Classe :</strong> {selectedGroupName}<br />
    • <strong>Scolarité :</strong> {feeName(tuitionId)} · <strong>Inscription :</strong> {feeName(registrationId)}<br />
    • <strong>Date d’inscription :</strong> {enrolledOn}
   </div>
  </div>}
  {!availableGroups.length && portal.perms.permissions.includes('academic.group.manage') && <button type="button" className="btn btn-outline" onClick={()=>configure('group_offerings')}>Configurer les groupes dans l’année</button>}<label className="form-group">Groupe<select className="select-input" required value={groupId} onChange={event=>setGroupId(event.target.value)}><option value="">Choisir le groupe</option>{availableGroups.map(row=><option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
  {groupId && <>{[{category:'SCOLARITE',label:'Tarif de scolarité',value:tuitionId,set:setTuitionId},{category:'INSCRIPTION',label:'Tarif d’inscription',value:registrationId,set:setRegistrationId}].map(field=><div key={field.category}>{!fees(field.category).length && portal.perms.permissions.includes('payment.record') && <button type="button" className="btn btn-outline" onClick={()=>configure('annual_fee_schedules',field.category)}>Configurer {field.label.toLocaleLowerCase('fr')} dans l’année</button>}<label className="form-group">{field.label}<select className="select-input" required value={field.value} onChange={event=>field.set(event.target.value)}><option value="">Choisir le tarif applicable</option>{fees(field.category).map(fee=><option key={fee.id} value={fee.id}>{fee.amount.toLocaleString('fr-FR')} FCFA · {fee.program_id?'Filière spécifique':'Commun'} · {fee.level_id?'Niveau spécifique':'Tous niveaux'}{fee.delivery_mode ? ` · ${fee.delivery_mode}` : ''}</option>)}</select></label></div>)}</>}
 </>}</>}
 {ready && <><label className="form-group">Date d’inscription<input className="input" type="date" required value={enrolledOn} onChange={event=>setEnrolledOn(event.target.value)} /></label><label className="form-group">Motif<textarea className="input" maxLength={1000} placeholder="Optionnel — motif automatique si laissé vide" value={reason} onChange={event=>setReason(event.target.value)} /></label><DrawerActions><button className="btn btn-primary">Vérifier l’inscription</button></DrawerActions></>}</ReviewedForm>}</>}</DetailDrawer>;
}
