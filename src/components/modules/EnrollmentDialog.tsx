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
import type {EnrollmentDiplomaChoice} from '@/types/enrollment';
interface Directory {
 revision:number;
 candidates:{id:string;name:string;matricule:string;kind:string;eligible:boolean}[];
 offerings:{id:string;name:string;programId:string;doubleDegreeEligible?:boolean;levelId:string;deliveryMode?:string|null}[];
 groups:{id:string;offeringId:string;levelId?:string;name:string}[];
 fees:{id:string;double_degree?:boolean;category:string;amount:number;program_id:string|null;level_id:string|null;delivery_mode?:string|null}[];
}
function compatibleFees(directory:Directory|null,targetOffering:Directory['offerings'][number]|undefined,category:string,doubleDegree=false){
 if(!directory || !targetOffering)return [];
 const list=directory.fees.filter(row=>row.category===category && (row.double_degree===true)===doubleDegree && (!row.program_id || row.program_id===targetOffering.programId) && (!row.level_id || row.level_id===targetOffering.levelId) && (!row.delivery_mode || row.delivery_mode===targetOffering.deliveryMode));
 // Si des tarifs spécifiques à la filière et au niveau existent, on n'autorise QUE ce tarif officiel (aucun bypass)
 const specific=list.filter(row=>row.program_id===targetOffering.programId && row.level_id===targetOffering.levelId);
 if(specific.length)return specific;
 const programSpecific=list.filter(row=>row.program_id===targetOffering.programId);
 if(programSpecific.length)return programSpecific;
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
 const [studentId,setStudentId]=useState(''),[offeringId,setOfferingId]=useState(''),[groupId,setGroupId]=useState(''),[tuitionId,setTuitionId]=useState(''),[registrationId,setRegistrationId]=useState('');
 const [doubleDegree,setDoubleDegree]=useState<EnrollmentDiplomaChoice['doubleDegree']>(false);
 const [fullPayment,setFullPayment]=useState(false);
 const selectedYear=portal.academicYearContext?.years.find(year=>year.id===portal.academicYearContext?.selectedYearId);
 const applyOfferingSelection=useCallback((nextOfferingId:string,directory:Directory|null)=>{
  setOfferingId(nextOfferingId);setDoubleDegree(false);setFullPayment(false);
  if(!directory || !nextOfferingId){
   setGroupId('');setTuitionId('');setRegistrationId('');
   return;
  }
  const nextOffering=directory.offerings.find(row=>row.id===nextOfferingId);
  const groupsForLevel=matchingGroupsForOffering(directory,nextOfferingId);
  setGroupId(groupsForLevel[0]?.id || '');
  const tuitionChoices=compatibleFees(directory,nextOffering,'SCOLARITE',false);
  const registrationChoices=compatibleFees(directory,nextOffering,'INSCRIPTION',false);
  setTuitionId(tuitionChoices[0]?.id || '');
  setRegistrationId(registrationChoices[0]?.id || '');
 },[]);
 useEffect(()=>{const controller=new AbortController();setData(null);setError('');void enrollmentOperation(portal.activeRole,undefined,controller.signal).then(value=>{if(!controller.signal.aborted){setData(value);const created=value.candidates.find((row:Directory['candidates'][number])=>row.matricule===pendingMatricule);if(created)setStudentId(created.id);}}).catch(cause=>{if(!controller.signal.aborted)setError(cause.message);});return()=>controller.abort();},[portal.activeRole,retry,pendingMatricule,portal.academicYearSelection]);
 const matchedKind=data?.candidates.find(row=>row.matricule===initialMatricule)?.kind;
 const operationKind=kind==='auto'?(matchedKind==='new'||matchedKind==='reenroll'?matchedKind:undefined):kind;
 const offering=data?.offerings.find(row=>row.id===offeringId);const student=data?.candidates.find(row=>row.id===studentId);
 const availableGroups=matchingGroupsForOffering(data,offeringId);
 const fees=(category:string)=>compatibleFees(data,offering,category,doubleDegree);
 const ready=!!(operationKind && student?.eligible && offering && groupId && tuitionId && registrationId);
 const candidates=data?.candidates.filter(row=>row.kind===operationKind && (!initialMatricule || row.matricule===initialMatricule)) || [];
 const feeName=(id:string)=>{const fee=data?.fees.find(row=>row.id===id);return fee?`${fee.amount.toLocaleString('fr-FR')} FCFA`:'';};
 const selectedGroupName=availableGroups.find(row=>row.id===groupId)?.name || data?.groups.find(row=>row.id===groupId)?.name || '';
 const configure=(root:string,category?:string)=>setConfiguration({root,category});
 const rawTuition=data?.fees.find(row=>row.id===tuitionId)?.amount || 0;
 const rawRegistration=data?.fees.find(row=>row.id===registrationId)?.amount || 0;
 const discount15=fullPayment?Math.round(rawTuition*0.15):0;
 const netTuition=rawTuition-discount15;
 const totalContract=netTuition+rawRegistration;
 if(configuration && selectedYear)return <YearPreparationPanel yearId={selectedYear.id} yearName={selectedYear.name} onClose={()=>{setConfiguration(null);setRetry(value=>value+1);}} />;
 return <DetailDrawer title={operationKind==='new'?'Nouvelle inscription':'Réinscrire un ancien étudiant'} onClose={onClose}>{!data?error?<p role="alert">{error}<IconButton className="btn btn-outline" onClick={()=>setRetry(value=>value+1)} label="Réessayer" /></p>:<LoadingState label="Vérification des dossiers et des tarifs…" />:<><p>{operationKind==='new'?'Uniquement les dossiers sans inscription antérieure ni origine historique. Créez d’abord l’identité si elle n’existe pas.':'Choisissez simplement la formation de l’année : le groupe, les frais de scolarité et les frais d’inscription sont sélectionnés automatiquement selon la filière.'}</p>{operationKind==='new' && !initialMatricule && <StudentCrudActions onCreated={matricule=>{setPendingMatricule(matricule);setRetry(value=>value+1);}} />}{!candidates.length?<p>Aucun dossier correspondant à ce parcours.</p>:<ReviewedForm validate={()=>ready?null:'Choisissez le dossier, sa formation, son groupe et ses tarifs avant de continuer.'} busy={busy} error={error} confirmLabel={operationKind==='new'?'Confirmer la nouvelle inscription':'Confirmer la réinscription'} fields={[{label:'Étudiant',value:student?`${student.name} · ${student.matricule}`:''},{label:'Formation',value:offering?.name || ''},{label:'Groupe',value:selectedGroupName},{label:'Double diplomation (facultative)',value:doubleDegree?'Oui (Frais de base complets)':'Non (Cursus standard, tarif réduit de 50 %)'},{label:'Modalité de paiement',value:fullPayment?'Paiement comptant en 1 fois (Remise de 15 %)':'Échéancier standard (par tranches)'},...(fullPayment?[{label:'Scolarité brute',value:`${rawTuition.toLocaleString('fr-FR')} FCFA`},{label:'Remise comptant 15 %',value:`- ${discount15.toLocaleString('fr-FR')} FCFA`},{label:'Scolarité nette',value:`${netTuition.toLocaleString('fr-FR')} FCFA`}]:[{label:'Scolarité',value:feeName(tuitionId)}]),{label:'Frais d’inscription',value:feeName(registrationId)},{label:'Total contractuel dû',value:`${totalContract.toLocaleString('fr-FR')} FCFA`}]} consequence="L’inscription, le groupe et un contrat en brouillon seront enregistrés ensemble. Les tarifs officiels choisis seront conservés dans le contrat. Aucun paiement, reçu ou compte de connexion ne sera créé par cette opération." onConfirm={()=>{setBusy(true);setError('');void enrollmentOperation(portal.activeRole,{kind:operationKind,doubleDegree,fullPaymentDiscount:fullPayment,studentId,offeringId,groupId,tuitionId,registrationId,revision:data.revision}).then(()=>{portal.reportActionOutcome({title:operationKind==='new'?'Nouvelle inscription enregistrée':'Réinscription enregistrée',detail:'L’inscription et le contrat en brouillon sont enregistrés. Vérifiez le contrat avant son approbation et le suivi financier.'});onClose();portal.refreshCampus();}).catch(cause=>setError(cause.message)).finally(()=>setBusy(false));}}>
 <label className="form-group">Étudiant<select className="select-input" required value={studentId} onChange={event=>{setStudentId(event.target.value);setDoubleDegree(false);setFullPayment(false);setOfferingId('');setGroupId('');setTuitionId('');setRegistrationId('');}}><option value="">Choisir le dossier</option>{candidates.map(row=><option key={row.id} value={row.id} disabled={!row.eligible}>{row.name} · {row.matricule}{!row.eligible?' · ancienne inscription à reprendre':''}</option>)}</select></label>
 {student?.eligible && <>{!data.offerings.length && portal.perms.permissions.includes('academic.structure.manage') && <button type="button" className="btn btn-outline" onClick={()=>configure('academic_offerings')}>Configurer l’année</button>}<label className="form-group">Formation de l’année<select className="select-input" required value={offeringId} onChange={event=>applyOfferingSelection(event.target.value,data)}><option value="">Choisir la formation</option>{data.offerings.map(row=><option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
 {offering && <>
  {offering.doubleDegreeEligible && <label className="form-group">Double diplomation (facultative)<select className="select-input" value={doubleDegree?'yes':'no'} onChange={event=>{const selected=event.target.value==='yes';setDoubleDegree(selected);const tFees=compatibleFees(data,offering,'SCOLARITE',selected);const rFees=compatibleFees(data,offering,'INSCRIPTION',selected);setTuitionId(tFees[0]?.id || '');setRegistrationId(rFees[0]?.id || '');}}><option value="no">Non (Cursus ESCEN standard · Tarif normal réduit de moitié)</option><option value="yes">Oui, l’étudiant choisit la double diplomation (Tarif de base)</option></select><small>Ce choix est enregistré pour cette année. Les tarifs du parcours choisi sont assignés automatiquement selon la filière.</small></label>}
  <label className="form-group">Modalité de paiement de la scolarité<select className="select-input" value={fullPayment?'yes':'no'} onChange={event=>setFullPayment(event.target.value==='yes')}><option value="no">Échéancier standard (par tranches au cours de l’année)</option><option value="yes">Paiement intégral d’un coup (Réduction de 15 % appliquée automatiquement)</option></select><small>{fullPayment?'Une réduction immédiate de 15 % est déduite de la scolarité pour règlement comptant d’un coup.':'Règlement échelonné par tranches contractuelles.'}</small></label>
  {ready && <div className="info-box" style={{marginBottom:'0.85rem',borderLeft:'4px solid var(--success, #15803d)'}}>
   <strong>Affectation automatique prête :</strong>
   <div style={{marginTop:'0.35rem',fontSize:'0.9rem'}}>
    • <strong>Groupe / Classe :</strong> {selectedGroupName}<br />
    • <strong>Scolarité :</strong> {fullPayment?`${netTuition.toLocaleString('fr-FR')} FCFA (15 % de remise comptant déduits)`:feeName(tuitionId)} · <strong>Inscription :</strong> {feeName(registrationId)}<br />
    • <strong>Total dû :</strong> {totalContract.toLocaleString('fr-FR')} FCFA
   </div>
  </div>}
  {!availableGroups.length && portal.perms.permissions.includes('academic.group.manage') && <button type="button" className="btn btn-outline" onClick={()=>configure('group_offerings')}>Configurer les groupes dans l’année</button>}<label className="form-group">Groupe<select className="select-input" required value={groupId} onChange={event=>setGroupId(event.target.value)}><option value="">Choisir le groupe</option>{availableGroups.map(row=><option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
  {groupId && <>{[{category:'SCOLARITE',label:'Tarif de scolarité',value:tuitionId,set:setTuitionId},{category:'INSCRIPTION',label:'Tarif d’inscription',value:registrationId,set:setRegistrationId}].map(field=>{
   const categoryFees=fees(field.category);
   const isSpecific=categoryFees.length===1 && categoryFees[0].program_id===offering.programId;
   return <div key={field.category}>{!categoryFees.length && portal.perms.permissions.includes('payment.record') && <button type="button" className="btn btn-outline" onClick={()=>configure('annual_fee_schedules',field.category)}>Configurer {field.label.toLocaleLowerCase('fr')} dans l’année</button>}<label className="form-group">{field.label}<select className="select-input" required value={field.value} onChange={event=>field.set(event.target.value)}><option value="">Choisir le tarif applicable</option>{categoryFees.map(fee=><option key={fee.id} value={fee.id}>{fee.amount.toLocaleString('fr-FR')} FCFA · {fee.program_id?'Filière spécifique (assigné automatiquement)':'Commun'} · {fee.level_id?'Niveau spécifique':'Tous niveaux'}{fee.delivery_mode ? ` · ${fee.delivery_mode}` : ''}</option>)}</select>{isSpecific && <small style={{color:'var(--success,#15803d)',fontWeight:500}}>✓ Tarif officiel imposé automatiquement pour cette filière et ce niveau (aucun bypass).</small>}</label></div>;
  })}</>}
 </>}</>}
 {ready && <DrawerActions><button className="btn btn-primary">Vérifier l’inscription</button></DrawerActions>}</ReviewedForm>}</>}</DetailDrawer>;
}
