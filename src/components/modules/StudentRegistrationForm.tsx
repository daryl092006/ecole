import ActionPanel from '@/components/ui/ActionPanel';
import FormFeedback from '@/components/ui/FormFeedback';
import { useFeedback } from '@/hooks/useFeedback';
import { useState } from 'react';
import type { Group } from '@/types';
import type { StudentInput } from '@/services/studentService';
interface Props { groups: Group[]; onCreate: (input: StudentInput) => void; }
const empty: StudentInput = { matricule: '', firstname: '', lastname: '', email: '', groupId: '', filiere: '' };
export default function StudentRegistrationForm({ groups, onCreate }: Props) {
  const [input, setInput] = useState(empty);
  const [feedback, setFeedback, feedbackError] = useFeedback();
  const group = groups.find(item => item.id === input.groupId);
  return <ActionPanel label="Ajouter un étudiant inscrit"><form className="action-form" onSubmit={event => {
    event.preventDefault();
    try { onCreate(input); setInput(empty); setFeedback('Dossier enregistré.'); }
    catch (error) { setFeedback(error instanceof Error ? error.message : 'Enregistrement impossible.', true); }
  }}>

    <div className="form-row">
      {(['matricule', 'firstname', 'lastname', 'email'] as const).map((field, index) => <label className="form-group" key={field}>{['Matricule', 'Prénom', 'Nom', 'Email'][index]}<input className="input" type={field === 'email' ? 'email' : 'text'} required={field !== 'email'} value={input[field]} onChange={event => setInput({ ...input, [field]: event.target.value })} /></label>)}
      <label className="form-group">Groupe<select className="select-input" required value={input.groupId} onChange={event => setInput({ ...input, groupId: event.target.value, filiere: '' })}><option value="">Sélectionner</option>{groups.map(item => <option key={item.id} value={item.id}>{item.name} · {item.academicYear}</option>)}</select></label>
      <label className="form-group">Filière<select className="select-input" required value={input.filiere} onChange={event => setInput({ ...input, filiere: event.target.value })}><option value="">Sélectionner</option>{group?.filieres.map(name => <option key={name}>{name}</option>)}</select></label>
    </div><button className="btn btn-primary" disabled={!groups.length}>Enregistrer le dossier</button>
    {!groups.length && <p>Créez d’abord une année ouverte, une filière et un groupe dans le référentiel académique.</p>}
    <FormFeedback message={feedback} error={feedbackError} />
  </form></ActionPanel>;
}
