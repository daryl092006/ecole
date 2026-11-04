'use client';
import {useState} from 'react';
import {usePortal} from '@/hooks/usePortal';
import {mutateFinanceSettings,previewFinanceScholarship} from '@/services/financeSettingsService';
import type {FinanceSettingsDirectory,ScholarshipFinancialPreview} from '@/types/financeSettings';
import ReviewedForm from '@/components/ui/ReviewedForm';
import DrawerActions from '@/components/ui/DrawerActions';

const money=(value:number)=>`${value.toLocaleString('fr-FR')} FCFA`;
export default function ScholarshipAwardForm({directory,onSaved,onBusyChange}:{directory:FinanceSettingsDirectory;onSaved:(message:string)=>void;onBusyChange:(busy:boolean)=>void}){
  const portal=usePortal();
  const [enrollmentId,setEnrollmentId]=useState(directory.enrolledStudents.find(row=>row.scholarshipContext?.eligible)?.enrollmentId || directory.enrolledStudents[0]?.enrollmentId || '');
  const [scholarshipId,setScholarshipId]=useState(directory.scholarships.find(row=>row.active)?.id || '');
  const [validFrom,setValidFrom]=useState(new Date().toISOString().slice(0,10));
  const [reason,setReason]=useState(''),[confirmStacking,setConfirmStacking]=useState(false);
  const [basis,setBasis]=useState<''|'GROSS'|'REMAINING'>('');
  const [preview,setPreview]=useState<ScholarshipFinancialPreview|null>(null);
  const [revision,setRevision]=useState(directory.revision);
  const [schedule,setSchedule]=useState<ScholarshipFinancialPreview['installments']>([]);
  const [error,setError]=useState(''),[busy,setBusyState]=useState(false);
  const setBusy=(value:boolean)=>{setBusyState(value);onBusyChange(value);};
  const student=directory.enrolledStudents.find(row=>row.enrollmentId===enrollmentId);
  const context=student?.scholarshipContext;
  const scholarship=directory.scholarships.find(row=>row.id===scholarshipId);
  const hasBenefits=!!context?.hasExistingBenefits;
  const calculationBasis=hasBenefits?basis:'GROSS';
  const invalidate=()=>{setPreview(null);setSchedule([]);setError('');};
  const validateInputs=()=>!directory.selectedYearId?'Choisissez une année précise.':!student?'Sélectionnez un étudiant inscrit.':!context?.eligible?context?.blockingReason || 'Le contrat est indisponible.':!scholarship?.active?'Choisissez une bourse active.':!validFrom?'La date d’effet est obligatoire.':reason.trim().length<3?'Un motif est obligatoire.':hasBenefits && (!confirmStacking || !basis)?'Décidez explicitement du cumul et de sa base de calcul.':null;
  const calculate=async()=>{
    const problem=validateInputs();if(problem){setError(problem);return;}
    setBusy(true);setError('');setPreview(null);
    try{
      const result=await previewFinanceScholarship(portal.activeRole,{revision:directory.revision,enrollmentId,scholarshipId,validFrom,reason:reason.trim(),calculationBasis:calculationBasis || 'GROSS',confirmStacking});
      setRevision(result.revision);setPreview(result.preview);
      setSchedule(result.preview.installments.length?result.preview.installments:result.preview.newTotal>0?[{dueOn:validFrom,amount:result.preview.newTotal}]:[]);
    }catch(cause){setError(cause instanceof Error?cause.message:'Calcul indisponible.');}finally{setBusy(false);}
  };
  return <ReviewedForm busy={busy} error={error} completionKey={`${enrollmentId}:${scholarshipId}:${preview?.versionId || ''}`} confirmLabel="Confirmer l’attribution et le contrat"
    consequence={preview?.contractStatus==='APPROVED'?'La bourse et sa réduction de scolarité seront enregistrées ensemble. Un avenant conservera l’ancien contrat et réaffectera les paiements existants. Les frais d’inscription restent inchangés. Un éventuel trop-perçu reste disponible, sans remboursement automatique.':'La bourse et sa réduction seront intégrées au contrat en brouillon. Son approbation reste nécessaire pour établir le montant dû officiel. Les frais d’inscription restent inchangés.'}
    fields={[{label:'Étudiant bénéficiaire',value:student?`${student.name} · ${student.matricule}`:''},{label:'Année',value:directory.selectedYearCode},{label:'Bourse',value:scholarship?.name || ''},{label:'Frais concernés',value:'Scolarité uniquement'},{label:'Base de calcul',value:preview?money(preview.base):''},{label:'Cumul',value:confirmStacking?'Cumul explicitement autorisé':'Aucun cumul autorisé'},{label:'Réduction de scolarité',value:preview?money(preview.reduction):''},{label:'Total contractuel',previous:preview?money(preview.oldTotal):'',value:preview?money(preview.newTotal):''},{label:'Inscription brute inchangée',value:preview?money(preview.registration):''},{label:'Déjà payé, net de remboursements',value:preview?money(preview.paid):''},{label:'Reste à payer',value:preview?money(preview.remaining):''},{label:'Trop-perçu conservé',value:preview?money(preview.unallocatedCredit):''},...schedule.map((row,index)=>({label:`Échéance ${index+1}`,value:`${row.dueOn} · ${money(row.amount)}`})),{label:'Date d’effet',value:validFrom},{label:'Motif',value:reason}]}
    validate={()=>validateInputs() || (!preview?'Calculez l’effet financier avant de continuer.':schedule.reduce((sum,row)=>sum+row.amount,0)!==preview.newTotal?'Le total des échéances doit correspondre au nouveau montant net.':schedule.some(row=>!row.dueOn || !Number.isSafeInteger(row.amount) || row.amount<0)?'Vérifiez les dates et montants des échéances.':null)}
    onConfirm={async()=>{if(!preview)return;setBusy(true);setError('');try{
      await mutateFinanceSettings(portal.activeRole,{action:'award_scholarship',revision,enrollmentId,scholarshipId,validFrom,reason:reason.trim(),calculationBasis:calculationBasis || 'GROSS',confirmStacking,versionId:preview.versionId,reviewedReduction:preview.reduction,reviewedTotal:preview.newTotal,installments:schedule});
      portal.refreshCampus();onSaved(preview.contractStatus==='APPROVED'?'Bourse appliquée : contrat, échéancier et paiements mis à jour.':'Bourse intégrée au brouillon : approuvez le contrat pour établir le montant dû officiel.');
    }catch(cause){setError(cause instanceof Error?cause.message:'Attribution refusée.');}finally{setBusy(false);}}}>
    {error && <p className="restricted-box" role="alert">{error}</p>}
    <label className="form-group">Étudiant inscrit ({directory.selectedYearCode})<select className="select-input" required value={enrollmentId} onChange={event=>{setEnrollmentId(event.target.value);setConfirmStacking(false);setBasis('');invalidate();}}><option value="">Choisir un étudiant</option>{directory.enrolledStudents.map(row=><option key={row.enrollmentId} value={row.enrollmentId}>[{row.matricule}] {row.name} · {row.levelName}</option>)}</select></label>
    {student && !context?.eligible && <p role="alert">{context?.blockingReason || 'Contrat indisponible pour cette attribution.'}</p>}
    <label className="form-group">Bourse ou partenariat<select className="select-input" required value={scholarshipId} onChange={event=>{setScholarshipId(event.target.value);invalidate();}}><option value="">Choisir une bourse</option>{directory.scholarships.filter(row=>row.active).map(row=><option key={row.id} value={row.id}>{row.name} · {row.kind==='POURCENTAGE'?`${row.percent} %`:money(row.amount || 0)}</option>)}</select></label>
    {!directory.scholarships.some(row=>row.active) && <p>Ajoutez une bourse dans le catalogue avant de l’attribuer.</p>}
    <p>La bourse s’applique uniquement à la scolarité. Les frais d’inscription sont conservés.</p>
    {hasBenefits && <fieldset><legend>Réduction ou bourse déjà présente</legend><p>Réductions contractuelles existantes : {money(context?.existingReductions || 0)}.</p>
      <label><input type="checkbox" checked={confirmStacking} onChange={event=>{setConfirmStacking(event.target.checked);invalidate();}}/> J’autorise explicitement le cumul avec les avantages existants</label>
      <label className="form-group">Base du cumul<select className="select-input" value={basis} required onChange={event=>{setBasis(event.target.value as typeof basis);invalidate();}}><option value="">Choisir la base de calcul</option><option value="GROSS">Scolarité brute · {money(context?.tuitionGross || 0)}</option><option value="REMAINING">Scolarité après réductions · {money(context?.tuitionRemaining || 0)}</option></select></label>
    </fieldset>}
    <label className="form-group">Date de prise d’effet<input className="input" type="date" required value={validFrom} onChange={event=>{setValidFrom(event.target.value);invalidate();}}/></label>
    <label className="form-group">Motif d’attribution<textarea className="input" required minLength={3} maxLength={1000} value={reason} onChange={event=>{setReason(event.target.value);invalidate();}}/></label>
    <button type="button" className="btn btn-outline" disabled={busy} onClick={()=>void calculate()}>Calculer l’effet financier</button>
    {preview && <section aria-label="Effet financier de la bourse"><p>Réduction : <strong>{money(preview.reduction)}</strong> · Nouveau total : <strong>{money(preview.newTotal)}</strong></p><p>Reste à payer : {money(preview.remaining)} · Trop-perçu : {money(preview.unallocatedCredit)}.</p>
      {schedule.map((row,index)=><div className="form-grid" key={row.id || index}><label className="form-group">Date échéance {index+1}<input className="input" type="date" required value={row.dueOn} onChange={event=>setSchedule(current=>current.map((item,i)=>i===index?{...item,dueOn:event.target.value}:item))}/></label><label className="form-group">Montant échéance {index+1}<input className="input" type="number" min="0" step="1" required value={row.amount} onChange={event=>setSchedule(current=>current.map((item,i)=>i===index?{...item,amount:Number(event.target.value)}:item))}/></label></div>)}
    </section>}
    <DrawerActions><button className="btn btn-primary" disabled={!preview || busy}>Vérifier l’attribution et le contrat</button></DrawerActions>
  </ReviewedForm>;
}
