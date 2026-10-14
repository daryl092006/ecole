'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
export default function WorkPage({title,onClose,children}:{title:string;onClose:()=>void;children:ReactNode}) {
  const [target,setTarget]=useState<HTMLElement|null>(null);const heading=useRef<HTMLHeadingElement>(null);const close=useRef(onClose);close.current=onClose;
  useEffect(()=>{
    const main=document.getElementById('main-content');const previous=document.activeElement as HTMLElement|null;const scroll=main?.scrollTop || 0;
    setTarget(main);if(main)main.scrollTop=0;
    const keyboard=(event:KeyboardEvent)=>{if(event.key==='Escape'){event.preventDefault();close.current();}};
    document.addEventListener('keydown',keyboard);
    return()=>{document.removeEventListener('keydown',keyboard);if(main)main.scrollTop=scroll;if(previous?.isConnected)previous.focus();};
  },[]);
  useEffect(()=>{if(target)heading.current?.focus();},[target]);
  if(!target)return null;
  return createPortal(<section className="work-page" role="region" aria-label={title}><header className="work-page-heading"><button type="button" className="btn btn-outline" onClick={onClose}>← Retour à la liste</button><h1 ref={heading} tabIndex={-1}>{title}</h1></header><div className="work-page-feedback" /><div className="work-page-content">{children}</div></section>,target);
}
