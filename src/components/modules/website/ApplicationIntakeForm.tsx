'use client';
import { useState } from 'react';
import type { z } from 'zod';
import PhoneInput from '@/components/ui/PhoneInput';
import ReviewedForm from '@/components/ui/ReviewedForm';
import { applicationIntakeSchema } from '@/services/admissionsService';
import { identitySchema, diplomaSchema, guardianSchema, DOCUMENT_LABELS } from '@/services/websiteService';
import type { WebsiteIntake } from '@/types/website';
import type { AdmissionApplication } from '@/types/admissions';

export type IntakeInput = z.infer<typeof applicationIntakeSchema>;
const newGuardian = () => ({ nom: '', prenom: '', lien: '', tel: '', email: '', profession: '', adresse: '' });
export default function ApplicationIntakeForm({ intakes, initial, busy, error, onSave, title = 'Envoyer la candidature' }: {
  intakes: WebsiteIntake[]; initial?: AdmissionApplication; busy: boolean; error: string;
  onSave: (data: IntakeInput, files: FormData) => Promise<void>; title?: string;
}) {
  const [step, setStep] = useState(0); const [issue, setIssue] = useState('');
  const [identity, setIdentity] = useState<Record<string, string>>({ nom: '', prenom: '', genre: '', date_naissance: '', lieu_naissance: '', nationalite: '', email: '', tel: '', adresse: '',
    ...Object.fromEntries(Object.entries(initial?.identity || {}).filter(([key]) => ['nom','prenom','genre','date_naissance','lieu_naissance','nationalite','email','tel','tel2','tel3','adresse','nom_jeune_fille','numero_bordereau','moyen_connaissance_id','moyen_connaissance_precision'].includes(key))), ...(initial ? { date_naissance: initial.identity.date_naissance?.slice(0, 10) || '', genre: ['M','Masculin','Homme'].includes(initial.identity.genre) ? 'M' : ['F','Féminin','Femme'].includes(initial.identity.genre) ? 'F' : '' } : {}) });
  const [diploma, setDiploma] = useState<Record<string, string>>({ type_diplome_id: initial?.diploma.type_diplome_id || initial?.diploma.dernier_diplome || '' });
  const [intakeId, setIntakeId] = useState(initial?.intake_id || '');
  const [guardians, setGuardians] = useState<Record<string, string>[]>(initial?.guardians.length ? initial.guardians : [newGuardian()]);
  const [files, setFiles] = useState<Record<string, File | null>>({}); const [consent, setConsent] = useState(false);
  const intake = intakes.find(item => item.id === intakeId);
  const values = () => ({ identity, diploma, guardians, intake_id: intakeId, consent });
  const field = (key: string, label: string, type = 'text', required = true) => <label className="form-group" key={key}>{label}<input className="input" type={type} required={required} maxLength={key === 'adresse' ? 1000 : 200} value={identity[key] || ''} readOnly={!!initial && key === 'email'} onChange={event => setIdentity(value => ({ ...value, [key]: event.target.value }))} /></label>;
  function next() {
    const validation = step === 0
      ? identitySchema.extend({ adresse: applicationIntakeSchema.shape.identity.shape.adresse }).safeParse(identity).success && diplomaSchema.safeParse(diploma).success && !!intakeId
      : guardians.every(guardian => guardianSchema.extend({ lien: applicationIntakeSchema.shape.guardians.element.shape.lien }).safeParse(guardian).success);
    if (!validation) { setIssue(step === 0 ? 'Complétez les informations personnelles, le dernier diplôme et la formation.' : 'Renseignez le nom, le prénom, le lien et le téléphone de chaque parent ou tuteur.'); return; }
    setIssue(''); setStep(current => current + 1);
  }
  return <ReviewedForm busy={busy} error={error} completionKey={initial?.id || 'new'} confirmLabel={title}
    validate={() => { const result = applicationIntakeSchema.safeParse(values()); return result.success ? null : 'Vérifiez les informations obligatoires et acceptez la déclaration avant l’envoi.'; }}
    fields={[{ label: 'Candidat', value: `${identity.prenom} ${identity.nom}` }, { label: 'Email', value: identity.email }, { label: 'Formation', value: intake?.label || '' },
      { label: 'Parents ou tuteurs', value: String(guardians.length) }, { label: 'Pièces ajoutées', value: String(Object.values(files).filter(Boolean).length) }]}
    consequence={initial ? 'Les informations seront renvoyées à l’équipe admission pour une nouvelle vérification.' : 'La demande sera reçue par ESCEN. L’admission vérifiera le dossier, puis l’académie décidera de l’admissibilité. L’admission officielle dépendra du paiement des frais d’inscription.'}
    onConfirm={() => {
      const result = applicationIntakeSchema.parse(values()); const form = new FormData();
      for (const [key, file] of Object.entries(files)) if (file) form.append(key, file);
      void onSave(result, form);
    }}>
    <ol className="candidate-steps" aria-label="Étapes de candidature">{['Informations personnelles','Parents ou tuteurs','Documents'].map((label, index) => <li key={label} aria-current={step === index ? 'step' : undefined}><span>{index + 1}</span>{label}</li>)}</ol>
    {(issue || error) && <p className="restricted-box" role="alert">{issue || error}</p>}
    <section hidden={step !== 0} aria-label="Informations personnelles"><h2>Informations personnelles et formation</h2><div className="form-grid">
      {field('nom','Nom')}{field('prenom','Prénom')}
      <label className="form-group">Sexe<select required className="select-input" value={identity.genre} onChange={event => setIdentity(value => ({ ...value, genre: event.target.value }))}><option value="">Choisir</option><option value="M">Masculin</option><option value="F">Féminin</option></select></label>
      {field('date_naissance','Date de naissance','date')}{field('lieu_naissance','Lieu de naissance')}{field('nationalite','Nationalité')}
      {field('email','Adresse email','email')}<PhoneInput label="Téléphone du candidat" required value={identity.tel} onChange={tel => setIdentity(value => ({ ...value, tel }))} />
      {field('adresse','Adresse de résidence')}
      <label className="form-group">Formation souhaitée<select required className="select-input" value={intakeId} onChange={event => setIntakeId(event.target.value)}><option value="">Choisir une formation</option>{intakes.filter(item => item.active || item.id === initial?.intake_id).map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
      <label className="form-group">Dernier diplôme ou niveau obtenu<input className="input" required maxLength={200} value={diploma.type_diplome_id} onChange={event => setDiploma({ type_diplome_id: event.target.value })} /></label>
    </div></section>
    <section hidden={step !== 1} aria-label="Parents ou tuteurs"><h2>Parents ou tuteurs</h2>{guardians.map((guardian, index) => <fieldset className="candidate-guardian" key={index}><legend>Parent ou tuteur {index + 1}</legend><div className="form-grid">
      {(['nom','prenom','lien','profession','adresse','email'] as const).map(key => <label className="form-group" key={key}>{({ nom: 'Nom', prenom: 'Prénom', lien: 'Lien avec le candidat', profession: 'Profession', adresse: 'Adresse de résidence', email: 'Email (facultatif)' })[key]}<input className="input" type={key === 'email' ? 'email' : 'text'} required={['nom','prenom','lien'].includes(key)} maxLength={key === 'adresse' ? 1000 : 200} value={guardian[key] || ''} onChange={event => setGuardians(values => values.map((value, position) => position === index ? { ...value, [key]: event.target.value } : value))} /></label>)}
      <PhoneInput label={`Téléphone du parent ou tuteur ${index + 1}`} required value={guardian.tel || ''} onChange={tel => setGuardians(values => values.map((value, position) => position === index ? { ...value, tel } : value))} />
    </div>{guardians.length > 1 && <button type="button" className="btn btn-outline" onClick={() => setGuardians(values => values.filter((_, position) => position !== index))}>Retirer ce contact du formulaire</button>}</fieldset>)}
      {guardians.length < 5 && <button type="button" className="btn btn-outline" onClick={() => setGuardians(values => [...values, newGuardian()])}>Ajouter un parent ou tuteur</button>}
    </section>
    <section hidden={step !== 2} aria-label="Documents"><h2>Documents disponibles</h2><p>Vous pouvez envoyer votre candidature sans pièce jointe. L’admission vous indiquera les documents à compléter avant l’étude académique.</p>
      <div className="form-grid">{Object.entries(DOCUMENT_LABELS).map(([key, label]) => <label className="form-group" key={key}>{label}{intake?.required_documents.includes(key) ? ' · demandé pour l’étude' : ''}<input type="file" accept={key === 'photo_identite_file' ? 'image/jpeg,image/png' : 'application/pdf,image/jpeg,image/png'} onChange={event => setFiles(values => ({ ...values, [key]: event.target.files?.[0] || null }))} /><small>PDF, JPEG ou PNG · 5 Mo maximum</small></label>)}</div>
      <label className="candidate-consent"><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} />Je certifie l’exactitude des informations fournies et j’accepte leur utilisation pour traiter ma candidature.</label>
    </section>
    <div className="btn-group candidate-form-actions">{step > 0 && <button type="button" className="btn btn-outline" onClick={() => { setIssue(''); setStep(value => value - 1); }}>Précédent</button>}{step < 2 ? <button type="button" className="btn btn-primary" onClick={next}>Suivant</button> : <button type="submit" className="btn btn-primary">Vérifier avant l’envoi</button>}</div>
  </ReviewedForm>;
}
