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
import {calculateTuitionSchedule, type PaymentPlan} from '@/services/tuitionScheduleService';
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
 const [paymentPlan,setPaymentPlan]=useState<PaymentPlan>('ANNUEL');
 const [applyQuarterlyDiscount,setApplyQuarterlyDiscount]=useState(false);

 const selectedYear=portal.academicYearContext?.years.find(year=>year.id===portal.academicYearContext?.selectedYearId);
 const applyOfferingSelection=useCallback((nextOfferingId:string,directory:Directory|null)=>{
  setOfferingId(nextOfferingId);setDoubleDegree(false);setPaymentPlan('ANNUEL');setApplyQuarterlyDiscount(false);
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
 const schedule=calculateTuitionSchedule({
  tuitionAmount:rawTuition,
  registrationAmount:rawRegistration,
  paymentPlan,
  applyQuarterlyDiscount,
  yearStartsOn:selectedYear?.starts_on,
  yearEndsOn:selectedYear?.ends_on,
 });
 const netTuition=schedule.netTuition;
 const totalContract=schedule.netTotal;
 const discountAmount=schedule.discountAmount;
 const discountPercent=schedule.discountPercent;

 if(configuration && selectedYear)return <YearPreparationPanel yearId={selectedYear.id} yearName={selectedYear.name} onClose={()=>{setConfiguration(null);setRetry(value=>value+1);}} />;

 return <DetailDrawer title={operationKind==='new'?'Nouvelle inscription':'Réinscrire un ancien étudiant'} onClose={onClose}>{!data?error?<p role="alert">{error}<IconButton className="btn btn-outline" onClick={()=>setRetry(value=>value+1)} label="Réessayer" /></p>:<LoadingState label="Vérification des dossiers et des tarifs…" />:<><p>{operationKind==='new'?'Uniquement les dossiers sans inscription antérieure ni origine historique. Créez d’abord l’identité si elle n’existe pas.':'Choisissez simplement la formation de l’année : le groupe, les frais de scolarité et les frais d’inscription sont sélectionnés automatiquement selon la filière.'}</p>{operationKind==='new' && !initialMatricule && <StudentCrudActions onCreated={matricule=>{setPendingMatricule(matricule);setRetry(value=>value+1);}} />}{!candidates.length?<p>Aucun dossier correspondant à ce parcours.</p>:<ReviewedForm validate={()=>ready?null:'Choisissez le dossier, sa formation, son groupe et ses tarifs avant de continuer.'} busy={busy} error={error} confirmLabel={operationKind==='new'?'Confirmer la nouvelle inscription':'Confirmer la réinscription'} fields={[
  {label:'Étudiant',value:student?`${student.name} · ${student.matricule}`:''},
  {label:'Formation',value:offering?.name || ''},
  {label:'Groupe',value:selectedGroupName},
  {label:'Double diplomation (facultative)',value:doubleDegree?'Oui (Frais de base complets)':'Non (Cursus standard, tarif réduit de 50 %)'},
  {label:'Plan de paiement',value:paymentPlan==='ANNUEL'?'Paiement annuel comptant (1 tranche · Remise 15 % appliquée)':paymentPlan==='TRIMESTRIEL'?`Paiement trimestriel (3 tranches${applyQuarterlyDiscount?' · Remise 10 % accordée':' · Plein tarif 0 %'})`:'Paiement bimestriel (4 tranches · Plein tarif 0 %)'},
  ...(discountPercent>0?[
   {label:'Scolarité brute',value:`${rawTuition.toLocaleString('fr-FR')} FCFA`},
   {label:`Remise (${discountPercent} %)`,value:`- ${discountAmount.toLocaleString('fr-FR')} FCFA`},
   {label:'Scolarité nette due',value:`${netTuition.toLocaleString('fr-FR')} FCFA`}
  ]:[
   {label:'Scolarité',value:feeName(tuitionId)}
  ]),
  {label:'Frais d’inscription',value:feeName(registrationId)},
  {label:'Total contractuel net dû',value:`${totalContract.toLocaleString('fr-FR')} FCFA`},
  ...schedule.installments.map(inst=>({
   label:`Échéance tranche ${inst.position}`,
   value:`${inst.amount.toLocaleString('fr-FR')} FCFA (${new Date(inst.dueOn).toLocaleDateString('fr-FR')}) · ${inst.description}`
  }))
 ]} consequence="L’inscription, le groupe, les tranches de l’échéancier et un contrat en brouillon seront enregistrés ensemble. Le montant contractuel net et les échéances définies seront conservés. Aucun reçu de paiement n’est créé à ce stade." onConfirm={()=>{
  setBusy(true);setError('');
  void enrollmentOperation(portal.activeRole,{
   kind:operationKind,
   doubleDegree,
   paymentPlan,
   applyQuarterlyDiscount,
   fullPaymentDiscount:paymentPlan==='ANNUEL',
   studentId,
   offeringId,
   groupId,
   tuitionId,
   registrationId,
   revision:data.revision
  }).then(()=>{
   portal.reportActionOutcome({
    title:operationKind==='new'?'Nouvelle inscription enregistrée':'Réinscription enregistrée',
    detail:`L’inscription et le contrat (${schedule.installments.length} tranche${schedule.installments.length>1?'s':''}) sont enregistrés.`
   });
   onClose();
   portal.refreshCampus();
  }).catch(cause=>setError(cause.message)).finally(()=>setBusy(false));
 }}>
  <label className="form-group">Étudiant<select className="select-input" required value={studentId} onChange={event=>{setStudentId(event.target.value);setDoubleDegree(false);setPaymentPlan('ANNUEL');setApplyQuarterlyDiscount(false);setOfferingId('');setGroupId('');setTuitionId('');setRegistrationId('');}}><option value="">Choisir le dossier</option>{candidates.map(row=><option key={row.id} value={row.id} disabled={!row.eligible}>{row.name} · {row.matricule}{!row.eligible?' · ancienne inscription à reprendre':''}</option>)}</select></label>
  {student?.eligible && <>{!data.offerings.length && portal.perms.permissions.includes('academic.structure.manage') && <button type="button" className="btn btn-outline" onClick={()=>configure('academic_offerings')}>Configurer l’année</button>}<label className="form-group">Formation de l’année<select className="select-input" required value={offeringId} onChange={event=>applyOfferingSelection(event.target.value,data)}><option value="">Choisir la formation</option>{data.offerings.map(row=><option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
  {offering && <>
   {offering.doubleDegreeEligible && <label className="form-group">Double diplomation (facultative)<select className="select-input" value={doubleDegree?'yes':'no'} onChange={event=>{const selected=event.target.value==='yes';setDoubleDegree(selected);const tFees=compatibleFees(data,offering,'SCOLARITE',selected);const rFees=compatibleFees(data,offering,'INSCRIPTION',selected);setTuitionId(tFees[0]?.id || '');setRegistrationId(rFees[0]?.id || '');}}><option value="no">Non (Cursus ESCEN standard · Tarif normal réduit de moitié)</option><option value="yes">Oui, l’étudiant choisit la double diplomation (Tarif de base)</option></select><small>Ce choix est enregistré pour cette année. Les tarifs du parcours choisi sont assignés automatiquement selon la filière.</small></label>}

   <label className="form-group">Plan de paiement de la scolarité<select className="select-input" value={paymentPlan} onChange={event=>{const plan=event.target.value as PaymentPlan;setPaymentPlan(plan);if(plan!=='TRIMESTRIEL')setApplyQuarterlyDiscount(false);}}><option value="ANNUEL">Paiement annuel comptant (1 tranche · Remise 15 % appliquée d’office)</option><option value="TRIMESTRIEL">Paiement trimestriel (3 tranches · 10 % de remise sur accord)</option><option value="BIMESTRIEL">Paiement bimestriel (4 tranches · 0 % de remise · Plein tarif)</option></select><small>{paymentPlan==='ANNUEL'?'Règlement comptant intégral : réduction immédiate de 15 % déduite sur la scolarité. Une fois payé, le compte est marqué soldé.':paymentPlan==='TRIMESTRIEL'?'Règlement en 3 tranches au cours de l’année. Une réduction de 10 % peut être accordée si validée.':'Règlement échelonné en 4 tranches au cours de l’année sans réduction (plein tarif réparti).'}</small></label>

   {paymentPlan==='TRIMESTRIEL' && <label className="form-group" style={{display:'flex',alignItems:'center',gap:'0.5rem',marginTop:'0.25rem',cursor:'pointer'}}><input type="checkbox" checked={applyQuarterlyDiscount} onChange={e=>setApplyQuarterlyDiscount(e.target.checked)} style={{width:'18px',height:'18px'}} /><span><strong>Accorder la réduction de 10 % sur ce paiement trimestriel</strong> (décision exceptionnelle non automatique)</span></label>}

   {ready && <div className="info-box" style={{marginBottom:'0.85rem',borderLeft:'4px solid var(--success, #15803d)'}}>
    <strong>Plan financier et tranches calculées :</strong>
    <div style={{marginTop:'0.35rem',fontSize:'0.9rem'}}>
     • <strong>Groupe / Classe :</strong> {selectedGroupName}<br />
     • <strong>Scolarité :</strong> {rawTuition.toLocaleString('fr-FR')} FCFA {discountPercent>0?`→ ${netTuition.toLocaleString('fr-FR')} FCFA (Remise de ${discountPercent} % déduite)`:'(0 % de remise)'} · <strong>Inscription :</strong> {feeName(registrationId)}<br />
     • <strong>Total net dû :</strong> {totalContract.toLocaleString('fr-FR')} FCFA<br />
     <div style={{marginTop:'0.5rem',paddingTop:'0.5rem',borderTop:'1px dashed var(--border,#e2e8f0)'}}>
      <strong>Détail des {schedule.installments.length} tranches :</strong>
      <ul style={{margin:'0.25rem 0 0 1rem',padding:0}}>
       {schedule.installments.map(inst=><li key={inst.position}><strong>Tranche {inst.position} :</strong> {inst.amount.toLocaleString('fr-FR')} FCFA ({new Date(inst.dueOn).toLocaleDateString('fr-FR')}) — <em>{inst.description}</em></li>)}
      </ul>
     </div>
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
