'use client';

import { useId, useState } from 'react';
import { useDrawer } from './DetailDrawer';

const weekdays = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
const dateLabel = (date: string) => new Intl.DateTimeFormat('fr-FR', { dateStyle: 'full', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`));

export default function ScheduleDatePicker({ dates, onChange, initialDate, min, max }: {
  dates: string[]; onChange: (dates: string[]) => void; initialDate: string; min?: string; max?: string;
}) {
  const drawer = useDrawer();
  const headingId = useId();
  const [month, setMonth] = useState(() => (dates[0] || initialDate).slice(0, 7));
  const [error, setError] = useState('');
  const lower = min?.slice(0, 7), upper = max?.slice(0, 7);
  const visibleMonth = lower && month < lower ? lower : upper && month > upper ? upper : month;
  const [year, monthNumber] = visibleMonth.split('-').map(Number);
  const first = new Date(Date.UTC(year, monthNumber - 1, 1));
  const offset = (first.getUTCDay() + 6) % 7;
  const count = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const days = Array.from({ length: count }, (_, index) => `${visibleMonth}-${String(index + 1).padStart(2, '0')}`);
  const allowed = (date: string) => (!min || date >= min) && (!max || date <= max);
  const change = (next: string[]) => {
    const unique = [...new Set(next)].sort();
    if (unique.length > 60) { setError('Vous pouvez sélectionner au maximum 60 dates par enregistrement. Aucune date supplémentaire n’a été ajoutée.'); return; }
    setError('');
    if (unique.join() !== dates.join()) { drawer?.markDirty(); onChange(unique); }
  };
  const toggle = (date: string) => change(dates.includes(date) ? dates.filter(item => item !== date) : [...dates, date]);
  const move = (delta: number) => setMonth(new Date(Date.UTC(year, monthNumber - 1 + delta, 1)).toISOString().slice(0, 7));

  return <section className="schedule-date-picker" aria-labelledby={headingId}>
    <h3 id={headingId}>Choisir les dates des séances</h3>
    <p>Cliquez sur une date pour l’ajouter ou la retirer. La sélection est conservée d’un mois à l’autre. Les horaires ci-dessous s’appliquent à toutes les dates.</p>
    <div className="schedule-date-toolbar">
      <button type="button" className="btn btn-outline" aria-label="Mois précédent des dates de cours" disabled={!!lower && visibleMonth <= lower} onClick={() => move(-1)}>←</button>
      <label className="form-group">Mois des séances<input className="input" type="month" min={lower} max={upper} value={visibleMonth} onChange={event => { if (/^\d{4}-\d{2}$/.test(event.target.value)) setMonth(event.target.value); }} /></label>
      <button type="button" className="btn btn-outline" aria-label="Mois suivant des dates de cours" disabled={!!upper && visibleMonth >= upper} onClick={() => move(1)}>→</button>
    </div>
    <p className="schedule-date-month" aria-live="polite">{first.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' })}</p>
    <div className="schedule-date-grid" role="group" aria-label="Calendrier de sélection des séances">
      {weekdays.map(day => <span className="schedule-date-weekday" key={day} aria-label={day}>{day.slice(0, 3)}</span>)}
      {Array.from({ length: offset }, (_, index) => <span key={`empty-${index}`} aria-hidden="true" />)}
      {days.map(date => <button type="button" className="schedule-date-day" key={date} aria-label={dateLabel(date)} aria-pressed={dates.includes(date)} disabled={!allowed(date) || (dates.length >= 60 && !dates.includes(date))} onClick={() => toggle(date)}>{Number(date.slice(8))}</button>)}
    </div>
    <div className="schedule-date-shortcuts" role="group" aria-label="Ajouter des jours du mois affiché">
      {weekdays.map((day, index) => <button type="button" className="btn btn-sm btn-outline" key={day} onClick={() => change([...dates, ...days.filter(date => allowed(date) && (new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7 === index)])}>Tous les {day.toLocaleLowerCase('fr')}s du mois</button>)}
    </div>
    {error && <p className="restricted-box" role="alert">{error}</p>}
    <p role="status">{dates.length} date(s) sélectionnée(s) sur 60 maximum.</p>
    {dates.some(date => !allowed(date)) && <p className="restricted-box" role="alert">Certaines dates sélectionnées sont hors de la période de ce cours. Retirez-les avant de continuer.</p>}
    {dates.length > 0 && <><ul className="schedule-date-selection">{dates.map(date => <li key={date}><time dateTime={date}>{dateLabel(date)}</time><button type="button" className="btn btn-sm btn-outline" aria-label={`Retirer le ${dateLabel(date)}`} onClick={() => toggle(date)}>Retirer</button></li>)}</ul><button type="button" className="btn btn-outline" onClick={() => change([])}>Vider la sélection</button></>}
  </section>;
}
