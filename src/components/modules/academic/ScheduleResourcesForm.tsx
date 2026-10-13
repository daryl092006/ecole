import { useState } from 'react';
import type { BlockedPeriod, Room } from '@/types';
interface Props { rooms: Room[]; periods: BlockedPeriod[]; onRoom: (room: Room) => void; onPeriod: (label: string, start: string, end: string) => void; }
export default function ScheduleResourcesForm({ rooms, periods, onRoom, onPeriod }: Props) {
  const [code, setCode] = useState(''); const [name, setName] = useState(''); const [capacity, setCapacity] = useState('');
  const [label, setLabel] = useState(''); const [start, setStart] = useState(''); const [end, setEnd] = useState(''); const [feedback, setFeedback] = useState('');
  const run = (action: () => void) => { try { action(); setFeedback('Enregistrement effectué.'); } catch (error) { setFeedback(error instanceof Error ? error.message : 'Opération impossible.'); } };
  return <div className="card card-full mb-2"><div className="card-header"><h2>Salles et périodes bloquées</h2></div>
    <form className="form-row mb-2" onSubmit={event => { event.preventDefault(); run(() => { onRoom({ code: code.trim(), name: name.trim(), capacity: Number(capacity), building: '', status: 'Disponible' }); setCode(''); setName(''); setCapacity(''); }); }}>
      <label>Code salle<input className="input" required value={code} onChange={event => setCode(event.target.value)} /></label>
      <label>Nom salle<input className="input" required value={name} onChange={event => setName(event.target.value)} /></label>
      <label>Capacité<input className="input" required type="number" min="1" step="1" value={capacity} onChange={event => setCapacity(event.target.value)} /></label>
      <button className="btn btn-primary">Créer la salle</button>
    </form>
    <form className="form-row" onSubmit={event => { event.preventDefault(); run(() => { onPeriod(label, start, end); setLabel(''); setStart(''); setEnd(''); }); }}>
      <label>Jour férié ou période bloquée<input className="input" required value={label} onChange={event => setLabel(event.target.value)} /></label>
      <label>Début<input className="input" required type="date" value={start} onChange={event => setStart(event.target.value)} /></label>
      <label>Fin<input className="input" required type="date" value={end} onChange={event => setEnd(event.target.value)} /></label>
      <button className="btn btn-primary">Bloquer la période</button>
    </form>
    {feedback && <p role="status">{feedback}</p>}
    <p>{rooms.map(room => `${room.name} (${room.capacity} places)`).join(' · ') || 'Aucune salle.'}</p>
    {periods.map(period => <p key={period.id}>{period.label} : {period.startDate} · {period.endDate}</p>)}
  </div>;
}
