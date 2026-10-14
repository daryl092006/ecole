'use client';
import { useEffect,useState } from 'react';
import Link from 'next/link';
import {usePortal} from '@/hooks/usePortal';
import {loadRelationalCampus} from '@/services/remoteCampusService';
import type {RelationalSnapshot} from '@/types/persistence';
import type {AssessmentCategory} from '@/services/assessmentDisplayService';
import {ASSESSMENT_LABELS} from '@/services/assessmentDisplayService';
import ResponsiveTable from '@/components/ui/ResponsiveTable';
export default function NativeAssessmentWorkspace({category}:{category:AssessmentCategory}){
  const {activeRole,perms}=usePortal();const [data,setData]=useState<RelationalSnapshot|null>(null);const [error,setError]=useState('');
  useEffect(()=>{const controller=new AbortController();setData(null);setError('');void loadRelationalCampus(activeRole,controller.signal).then(result=>{if(!controller.signal.aborted)setData(result);}).catch(cause=>{if(!controller.signal.aborted)setError(cause instanceof Error?cause.message:'Chargement impossible.');});return()=>controller.abort();},[activeRole]);
  const rows=(data?.tables.evaluations || []).filter(row=>!row.cancelled_at && (category==='exam'?row.kind==='EXAMEN':category==='resit'?row.kind==='RATTRAPAGE':['DEVOIR','INTERROGATION','TP','EXPOSE','PROJET'].includes(String(row.kind))));
  return <div><div className="page-intro"><div><span className="page-eyebrow">PÉDAGOGIE</span><h1>{ASSESSMENT_LABELS[category]}</h1><p>Épreuves enregistrées dans votre périmètre d’enseignement.</p></div>{perms.permissions.includes('evaluation.create') && <Link className="btn btn-primary" href={`/academique/sujets?nouveau=1&nature=${category}`}>Composer une épreuve</Link>}</div>{error?<p role="alert">{error}</p>:!data?<p role="status">Chargement des épreuves…</p>:<section className="card"><ResponsiveTable className="data-table"><thead><tr><th>Épreuve</th><th>Groupe</th><th>État des notes</th></tr></thead><tbody>{rows.map(row=>{const assignment=data.tables.teaching_assignments?.find(a=>a.id===row.assignment_id);const group=data.tables.groups?.find(g=>g.id===assignment?.group_id);return <tr key={row.id}><td>{String(row.name)}</td><td>{String(group?.name || 'Non renseigné')}</td><td>{String(row.status)}</td></tr>;})}{!rows.length && <tr><td colSpan={3}>Aucune épreuve enregistrée dans cette catégorie et votre périmètre.</td></tr>}</tbody></ResponsiveTable></section>}</div>;
}
