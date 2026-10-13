import { useState } from 'react';
import type { Student } from '@/types';
interface Props { students: Student[]; onCreate: (studentId: string, amount: number, dates: string[]) => void; }
export default function FinanceContractForm({ students, onCreate }: Props) {
  const [studentId, setStudentId] = useState(''); const [amount, setAmount] = useState(''); const [dates, setDates] = useState<string[]>(['']); const [feedback, setFeedback] = useState('');
  return <form className="card card-full mb-2" onSubmit={event => {
    event.preventDefault(); try { onCreate(studentId, Number(amount), dates); setStudentId(''); setAmount(''); setDates(['']); setFeedback('Contrat et échéancier enregistrés.'); } catch (error) { setFeedback(error instanceof Error ? error.message : 'Opération impossible.'); }
  }}><div className="card-header"><h2>Définir le contrat de scolarité</h2></div>
    <div className="form-row"><label>Étudiant<select required className="select-input" value={studentId} onChange={event => setStudentId(event.target.value)}><option value="">Sélectionner</option>{students.filter(item => item.financials.expected === 0).map(item => <option key={item.matricule} value={item.matricule}>{item.firstname} {item.lastname}</option>)}</select></label>
    <label>Montant total (FCFA)<input required className="input" type="number" min="1" step="1" value={amount} onChange={event => setAmount(event.target.value)} /></label></div>
    <p>Échéances de montant égal ; le reliquat est ajouté à la dernière Échéance. Les dates sont définies explicitement.</p>
    <div className="form-row">{dates.map((date, index) => <label key={index}>Échéance {index + 1}<input className="input" required type="date" value={date} onChange={event => setDates(previous => previous.map((item, position) => position === index ? event.target.value : item))} /></label>)}</div>
    <div className="btn-group mt-2"><button type="button" className="btn btn-outline" onClick={() => setDates(previous => [...previous, ''])}>Ajouter une Échéance</button>{dates.length > 1 && <button type="button" className="btn btn-outline" onClick={() => setDates(previous => previous.slice(0, -1))}>Retirer la dernière</button>}<button className="btn btn-primary">Enregistrer le contrat</button></div>{feedback && <p role="status">{feedback}</p>}
  </form>;
}
