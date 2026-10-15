'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
export default function WorkPage({title,onClose,children,busy=false}:{title:string;onClose:()=>void;children:ReactNode;busy?:boolean}) {
  const [dirty,setDirty]=useState(false);const [discard,setDiscard]=useState(false);
  const [target,setTarget]=useState<HTMLElement|null>(null);const heading=useRef<HTMLHeadingElement>(null);const close=useRef(onClose);close.current=onClose;
  close.current=()=>{if(busy)return;if(dirty)setDiscard(true);else onClose();};
  useEffect(()=>{if(!dirty || busy)return;const protect=(event:BeforeUnloadEvent)=>{event.preventDefault();};window.addEventListener('beforeunload',protect);return()=>window.removeEventListener('beforeunload',protect);},[dirty,busy]);
  useEffect(()=>{
    const main=document.getElementById('main-content');const previous=document.activeElement as HTMLElement|null;const scroll=main?.scrollTop || 0;
    setTarget(main);if(main)main.scrollTop=0;
    const keyboard=(event:KeyboardEvent)=>{if(event.key==='Escape'){event.preventDefault();close.current();}};
    document.addEventListener('keydown',keyboard);
    return()=>{document.removeEventListener('keydown',keyboard);if(main)main.scrollTop=scroll;if(previous?.isConnected)previous.focus();};
  },[]);
  useEffect(()=>{if(target)heading.current?.focus();},[target]);
  if(!target)return null;
  return createPortal(<section className="work-page" role="region" aria-label={title} onInputCapture={()=>setDirty(true)}><header className="work-page-heading"><button type="button" className="btn btn-outline" disabled={busy} onClick={()=>close.current()}>← Retour à la liste</button><h1 ref={heading} tabIndex={-1}>{title}</h1></header>{discard && <section className="prerequisite-panel" role="alert"><h2>Quitter sans enregistrer ?</h2><p>Les informations saisies dans ce formulaire seront abandonnées. Aucune modification ne sera enregistrée.</p><div className="btn-group"><button className="btn btn-primary" onClick={()=>setDiscard(false)}>Continuer la saisie</button><button className="btn btn-outline" onClick={onClose}>Abandonner les modifications</button></div></section>}<div className="work-page-feedback" /><div className="work-page-content">{children}</div></section>,target);
}
