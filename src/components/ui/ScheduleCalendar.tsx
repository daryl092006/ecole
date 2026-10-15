'use client';
import { useState } from 'react';
export interface CalendarSession { id: string; start: string; end: string; title: string; subtitle: string; }
export default function ScheduleCalendar({ sessions, onSelect, period }: { sessions: CalendarSession[]; onSelect: (id: string) => void; period?: { id: string; starts_on: string; ends_on: string } }) {
  const validPeriod = !period || (/^\d{4}-\d{2}-\d{2}$/.test(period.starts_on) && /^\d{4}-\d{2}-\d{2}$/.test(period.ends_on) && period.starts_on <= period.ends_on);
  const inPeriod = (date: string) => !period || (date >= period.starts_on && date <= period.ends_on);
  const invalid = sessions.filter(row => !/^\d{4}-\d{2}-\d{2}/.test(row.start) || Number.isNaN(Date.parse(row.start)));
  const dated = sessions.filter(row => /^\d{4}-\d{2}-\d{2}/.test(row.start) && !Number.isNaN(Date.parse(row.start))).filter(row => inPeriod(row.start.slice(0,10))).sort((a,b) => a.start.localeCompare(b.start));
  const [selection, setSelection] = useState({ periodId: '', month: '' });
  const chosen = selection.periodId === (period?.id || '') ? selection.month : '';
  const lower = period?.starts_on.slice(0,7); const upper = period?.ends_on.slice(0,7);
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  const clamp = (month: string) => lower && month < lower ? lower : upper && month > upper ? upper : month;
  const setChosen = (month: string) => { if (/^\d{4}-\d{2}$/.test(month)) setSelection({ periodId: period?.id || '', month: clamp(month) }); };
  const base = clamp(chosen || dated[0]?.start.slice(0,7) || (inPeriod(today) ? today.slice(0,7) : lower) || today.slice(0,7));
  if (!validPeriod) return <section className="card" role="alert">Les dates de cette année doivent être renseignées pour afficher son calendrier.</section>;
  const [year, month] = base.split('-').map(Number);
  const first = new Date(year, month - 1, 1);
  const count = new Date(year, month, 0).getDate();
  const offset = (first.getDay() + 6) % 7;
  const move = (delta: number) => { const date = new Date(year, month - 1 + delta, 1); setChosen(`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`); };
  return <section className="card"><div className="calendar-toolbar"><button className="btn btn-outline" disabled={!!lower && base <= lower} onClick={() => move(-1)} aria-label="Mois précédent">←</button><h2>{first.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</h2><button className="btn btn-outline" disabled={!!upper && base >= upper} onClick={() => move(1)} aria-label="Mois suivant">→</button><button className="btn btn-outline" disabled={!inPeriod(today)} onClick={() => setChosen(today.slice(0,7))}>Aujourd’hui</button><label>Mois<input className="input" type="month" min={lower} max={upper} value={base} onChange={event => setChosen(event.target.value)} /></label></div>
    <div className="schedule-calendar-scroll"><div className="schedule-calendar" aria-label="Calendrier des séances">
      {['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'].map(day => <strong className="calendar-weekday" key={day}>{day}</strong>)}
      {Array.from({ length: offset }, (_, i) => <div className="calendar-day calendar-outside" key={`empty-${i}`} />)}
      {Array.from({ length: count }, (_, i) => { const date = `${base}-${String(i+1).padStart(2,'0')}`; if (!inPeriod(date)) return <div className="calendar-day calendar-outside" key={date} />; return <section className="calendar-day" key={date} aria-label={date}><time dateTime={date}>{i+1}</time>{dated.filter(row => row.start.slice(0,10) === date).map(row => <button className="calendar-session" key={row.id} onClick={() => onSelect(row.id)}><strong>{row.start.slice(11,16)}{row.end ? `–${row.end.slice(11,16)}` : ''} · {row.title}</strong><span>{row.subtitle}</span></button>)}</section>; })}
    </div></div>
    {!dated.length && <p>Aucune séance datée pour ces filtres.</p>}
    {invalid.length > 0 && <details><summary>Séances sans date valide ({invalid.length})</summary>{invalid.map(row => <button className="btn btn-outline" key={row.id} onClick={() => onSelect(row.id)}>{row.title} · Date à vérifier</button>)}</details>}
  </section>;
}
