'use client';
import {useState} from 'react';
import {usePortal} from '@/hooks/usePortal';
import {studentOperations} from '@/services/remoteCampusService';
import type {ContractAmendmentOption} from '@/types/contractAmendment';
import WorkPage from '@/components/ui/WorkPage';
import ReviewedForm from '@/components/ui/ReviewedForm';
import DrawerActions from '@/components/ui/DrawerActions';

const money=(amount:number)=>`${amount.toLocaleString('fr-FR')} FCFA`;
export default function ContractAmendmentPanel({matricule,options,revision,onSaved}:{matricule:string;options:ContractAmendmentOption[];revision:number;onSaved:()=>void}){
  const portal=usePortal();
  const [open,setOpen]=useState(false),[selected,setSelected]=useState(''),[percent,setPercent]=useState(''),[dueOn,setDueOn]=useState(''),[reason,setReason]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  const option=options.find(row=>`${row.enrollmentId}:${row.feeId}`===selected);
  if(!options.length || !portal.perms.permissions.includes('payment.record') || !portal.perms.permissions.includes('student.lifecycle.manage') || !portal.perms.permissions.includes('finance.view'))return null;
  const discount=option?Math.round(option.tuition*Number(percent)/100):0;
  return <>
    <button type="button" className="btn btn-outline" onClick={()=>{setOpen(true);setSelected(`${options[0].enrollmentId}:${options[0].feeId}`);setPercent('');setDueOn('');setReason('');setError('');}}>Régulariser la double diplomation</button>
    {open && <WorkPage title={`Avenant de double diplomation · ${matricule}`} busy={busy} onClose={()=>setOpen(false)}>
      <ReviewedForm busy={busy} error={error} confirmLabel="Confirmer l’avenant" consequence="L’ancien contrat restera dans l’historique. Une nouvelle version approuvée enregistrera la double diplomation et sa remise individuelle. Les échéances positives seront regroupées à la date saisie. Les paiements existants seront affectés au nouvel échéancier, sans nouveau versement ni nouveau reçu."
        fields={[{label:'Dossier étudiant',value:matricule},{label:'Double diplomation',previous:'Non',value:'Oui'},{label:'Ancien montant total',value:option?money(option.currentTotal):''},{label:'Scolarité brute',previous:option?money(option.currentTotal-option.registration):'',value:option?money(option.tuition):''},{label:'Remise individuelle',value:`${percent} % · ${money(discount)}`},{label:'Scolarité nette',value:option?money(option.tuition-discount):''},{label:'Inscription conservée',value:option?money(option.registration):''},{label:'Nouveau total dû',previous:option?money(option.currentTotal):'',value:option?money(option.tuition-discount+option.registration):''},{label:'Date d’échéance',value:dueOn}]}
        validate={()=>!option?'Choisissez le tarif.':percent==='' || !Number.isFinite(Number(percent)) || Number(percent)<0 || Number(percent)>=100?'Renseignez explicitement une remise entre 0 et moins de 100 %.':!dueOn?'Renseignez la date d’échéance.':null}
        onConfirm={async()=>{if(!option)return;setBusy(true);setError('');try{await studentOperations(matricule,portal.activeRole,{action:'amend_contract',revision,enrollmentId:option.enrollmentId,versionId:option.versionId,feeId:option.feeId,discountPercent:Number(percent),dueOn,reason:reason.trim() || 'Régularisation de double diplomation'});portal.refreshCampus();setOpen(false);onSaved();}catch(cause){setError(cause instanceof Error?cause.message:'Avenant indisponible.');}finally{setBusy(false);}}}>
        <label className="form-group">Tarif de double diplomation<select className="select-input" value={selected} onChange={event=>setSelected(event.target.value)}>{options.map(row=><option key={`${row.enrollmentId}:${row.feeId}`} value={`${row.enrollmentId}:${row.feeId}`}>{money(row.tuition)} · inscription {money(row.registration)}</option>)}</select></label>
        <label className="form-group">Remise individuelle (%)<input className="input" type="number" min="0" max="99.99" step="0.01" required value={percent} onChange={event=>setPercent(event.target.value)}/></label>
        <label className="form-group">Date d’échéance de l’avenant<input className="input" type="date" required value={dueOn} onChange={event=>setDueOn(event.target.value)}/></label>
        <DrawerActions><button className="btn btn-primary">Vérifier l’avenant</button></DrawerActions>
      </ReviewedForm>
    </WorkPage>}
  </>;
}
