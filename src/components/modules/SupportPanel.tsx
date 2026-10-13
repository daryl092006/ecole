import { useState } from 'react';
import type { SupportTicket } from '@/types/support';
interface Props { tickets: SupportTicket[]; canManage: boolean; onCreate: (title: string, description: string) => void; onTransition: (id: string, target: SupportTicket['status'], reason: string) => void; }
export default function SupportPanel({ tickets, canManage, onCreate, onTransition }: Props) {
  const [title, setTitle] = useState(''); const [description, setDescription] = useState(''); const [feedback, setFeedback] = useState('');
  return <div className="card card-full"><h2>Support technique</h2><form onSubmit={event => { event.preventDefault(); try { onCreate(title, description); setTitle(''); setDescription(''); setFeedback('Ticket ouvert.'); } catch (error) { setFeedback(error instanceof Error ? error.message : 'Opération impossible.'); } }}>
    <label>Titre<input required className="input" value={title} onChange={event => setTitle(event.target.value)} /></label><label>Description<textarea required className="input" value={description} onChange={event => setDescription(event.target.value)} /></label><button className="btn btn-primary">Ouvrir un ticket</button>
  </form>{feedback && <p role="status">{feedback}</p>}{!tickets.length && <p>Aucun ticket.</p>}{tickets.map(ticket => <article className="mb-2" key={ticket.id}><h3>{ticket.title} · {ticket.status}</h3><p>{ticket.description}</p><small>{ticket.author} · {ticket.createdAt}</small>
    {ticket.history.map((entry, index) => <p key={index}>{entry.newValue} · {entry.reason}</p>)}
    {canManage && ticket.status !== 'RESOLU' && <button className="btn btn-outline" onClick={() => { const reason = prompt('Compte rendu de traitement'); if (reason) try { onTransition(ticket.id, ticket.status === 'OUVERT' ? 'EN_COURS' : 'RESOLU', reason); } catch (error) { setFeedback(error instanceof Error ? error.message : 'Traitement impossible.'); } }}>{ticket.status === 'OUVERT' ? 'Prendre en charge' : 'Résoudre'}</button>}
  </article>)}</div>;
}
