'use client';

import Image from 'next/image';
import { useEffect, useId, useRef, useState } from 'react';
import { useDrawer } from './DetailDrawer';

export interface FlagOption { value: string; label: string; code?: string; }
interface Props {
  id?: string;
  label: string;
  value: string;
  options: FlagOption[];
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
}
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export default function FlagSelect({ id, label, value, options, onChange, required, disabled }: Props) {
  const drawer = useDrawer();
  const generatedId = useId();
  const controlId = id || generatedId;
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selected = options.find(option => option.value === value);
  const filtered = options.filter(option => normalize(option.label).includes(normalize(query)));
  useEffect(() => {
    if (!open) return;
    search.current?.focus();
    function outside(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);
  function choose(next: string) {
    if (next !== value && root.current?.closest('form')) drawer?.markDirty();
    onChange(next); setOpen(false); setQuery(''); trigger.current?.focus();
  }
  function flag(option: FlagOption) {
    return option.code && /^[a-z]{2}$/i.test(option.code)
      ? <Image className="country-flag-image" src={`https://flagcdn.com/w40/${option.code.toLowerCase()}.png`} alt="" width={20} height={15} unoptimized /> : null;
  }
  return <div className="flag-select" ref={root} onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget as Node)) setOpen(false);
  }} onKeyDown={event => {
    if (event.key === 'Escape' && open) { event.preventDefault(); event.stopPropagation(); setOpen(false); trigger.current?.focus(); }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) { setOpen(true); setQuery(''); return; }
      const items = Array.from(root.current?.querySelectorAll<HTMLButtonElement>('[role="option"]') || []);
      const index = items.indexOf(document.activeElement as HTMLButtonElement);
      items[(index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus();
    }
  }}>
    <select className="flag-select-validation" aria-hidden="true" tabIndex={-1} value={value} required={required} disabled={disabled} onChange={event => choose(event.target.value)} onInvalid={event => {
      event.preventDefault(); trigger.current?.focus(); setOpen(true);
    }}>{options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
    <button ref={trigger} id={controlId} type="button" className="select-input flag-select-trigger" role="combobox" aria-label={label} aria-required={required} aria-expanded={open} aria-controls={`${controlId}-options`} aria-haspopup="listbox" disabled={disabled} onClick={() => { setOpen(!open); setQuery(''); }}>
      {selected && flag(selected)}<span>{selected?.label || value}</span><span className="flag-select-chevron" aria-hidden="true">⌄</span>
    </button>
    {open && <div className="flag-select-menu">
      <input ref={search} type="search" className="input flag-select-search" aria-label={`Rechercher — ${label}`} placeholder="Rechercher un pays ou une nationalité…" value={query} onChange={event => setQuery(event.target.value)} onKeyDown={event => {
        if (event.key === 'Enter') { event.preventDefault(); if (filtered[0]) choose(filtered[0].value); }
      }} />
      <div className="flag-select-options" id={`${controlId}-options`} role="listbox" aria-label={label}>
        {filtered.map(option => <button type="button" role="option" aria-selected={option.value === value} className="flag-select-option" key={option.value} onClick={() => choose(option.value)}>{flag(option)}<span>{option.label}</span>{option.value === value && <span className="flag-select-check" aria-hidden="true">✓</span>}</button>)}
        {!filtered.length && <p className="flag-select-empty">Aucun résultat.</p>}
      </div>
    </div>}
  </div>;
}
