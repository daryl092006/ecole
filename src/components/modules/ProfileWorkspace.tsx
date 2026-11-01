'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePortal } from '@/hooks/usePortal';
import PhoneInput from '@/components/ui/PhoneInput';
import CountrySelect from '@/components/ui/CountrySelect';
import ReviewedForm from '@/components/ui/ReviewedForm';
import DrawerActions from '@/components/ui/DrawerActions';
import StudentIdCardBadge from '@/components/modules/student/StudentIdCardBadge';
import PageHeader from '@/components/ui/PageHeader';
import { saveOwnProfile } from '@/services/remoteCampusService';
import { displayedPhoneNumber } from '@/services/phoneNumberService';

const FIELD_LABELS = {
  phone: 'Téléphone',
  personalEmail: 'Email personnel de contact',
  birthDate: 'Date de naissance',
  gender: 'Genre',
  nationality: 'Nationalité',
  address: 'Adresse de résidence',
  city: 'Ville',
  country: 'Pays de résidence',
} as const;

export default function ProfileWorkspace() {
  const portal = usePortal();
  const { session, activeRole, relationalSnapshot } = portal;

  const isStudent = Boolean(session?.studentId || session?.matricule || activeRole === 'Étudiant' || activeRole === 'Délégué');

  const currentPerson = useMemo(() => {
    const tables = relationalSnapshot.tables || {};
    const people = tables.people || [];
    if (session?.studentId) {
      const studentRow = (tables.students || []).find(row => row.id === session.studentId);
      if (studentRow) {
        const found = people.find(p => p.id === studentRow.person_id);
        if (found) return found;
      }
    }
    if (session?.accountId) {
      const accountRow = (tables.accounts || []).find(row => row.id === session.accountId);
      if (accountRow) {
        const found = people.find(p => p.id === accountRow.person_id);
        if (found) return found;
      }
    }
    const byEmail = session?.email
      ? people.find(p => String(p.email || '').toLowerCase() === session.email.toLowerCase())
      : undefined;
    return byEmail || people[0] || null;
  }, [relationalSnapshot.tables, session]);

  const studentDossier = useMemo(() => {
    if (!session?.matricule) return null;
    return portal.students.find(s => s.matricule === session.matricule) || null;
  }, [portal.students, session?.matricule]);

  const studentProEmail = session?.matricule
    ? (studentDossier?.institutionalEmail || `${session.matricule.toLowerCase()}@escen.university`)
    : '';

  const initialForm = useMemo(() => {
    const rawEmail = String(currentPerson?.email ?? studentDossier?.email ?? '');
    const cleanPersonalEmail = (isStudent && rawEmail.toLowerCase().endsWith('@escen.university')) ? '' : rawEmail;
    return {
      phone: displayedPhoneNumber(currentPerson?.phone ?? studentDossier?.phone ?? ''),
      personalEmail: cleanPersonalEmail,
      birthDate: String(currentPerson?.birth_date ?? studentDossier?.birthDate ?? ''),
      gender: String(currentPerson?.gender ?? studentDossier?.gender ?? ''),
      nationality: String(currentPerson?.nationality ?? studentDossier?.nationality ?? ''),
      address: String(currentPerson?.address ?? studentDossier?.address ?? ''),
      city: String(currentPerson?.city ?? studentDossier?.city ?? ''),
      country: String(currentPerson?.country ?? studentDossier?.country ?? ''),
    };
  }, [currentPerson, studentDossier, isStudent]);

  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setForm(initialForm);
  }, [initialForm]);

  const changedFields = (Object.keys(FIELD_LABELS) as (keyof typeof FIELD_LABELS)[])
    .filter(key => form[key] !== initialForm[key])
    .map(key => ({
      label: FIELD_LABELS[key],
      previous: initialForm[key] || 'Non renseigné',
      value: form[key] || 'Non renseigné',
    }));

  const nameParts = (session?.name || '').trim().split(/\s+/);
  const displayFirstname = String(currentPerson?.firstname || studentDossier?.firstname || nameParts[0] || '');
  const displayLastname = String(currentPerson?.lastname || studentDossier?.lastname || nameParts.slice(1).join(' ') || '');

  return (
    <div className="domain-workspace workspace-stack">
      <PageHeader
        eyebrow="ESPACE PERSONNEL"
        title="Mon profil et mes coordonnées"
        description="Consultez et mettez à jour vos coordonnées personnelles et professionnelles."
      >
        <Link className="btn btn-outline" href="/mot-de-passe-modifier">Modifier mon mot de passe</Link>
        <Link className="btn btn-outline" href="/mon-espace/support">Signaler une erreur d’état civil</Link>
      </PageHeader>

      {session?.matricule && (
        <StudentIdCardBadge
          firstname={displayFirstname}
          lastname={displayLastname}
          matricule={session.matricule}
          filiere={studentDossier?.filiere || ''}
          niveau={studentDossier?.niveau || ''}
          groupe={studentDossier?.groupe || ''}
          academicYear={portal.academicYearContext?.years?.find(y => y.id === portal.academicYearContext?.selectedYearId)?.name || '2026-2027'}
        />
      )}

      <section className="card card-full">
        <div className="card-header">
          <h2>Identité officielle et rattachement</h2>
        </div>
        <dl className="record-details-grid">
          <div>
            <dt>Prénom</dt>
            <dd>{displayFirstname || 'Non renseigné'}</dd>
          </div>
          <div>
            <dt>Nom</dt>
            <dd>{displayLastname || 'Non renseigné'}</dd>
          </div>
          <div>
            <dt>Compte de connexion officiel (Email pro M365)</dt>
            <dd style={{ color: 'var(--primary, #0369a1)', fontWeight: 600 }}>
              {isStudent ? (studentProEmail || session?.email || 'Non renseigné') : (session?.email || 'Non renseigné')}
            </dd>
          </div>
          <div>
            <dt>Rôle actif</dt>
            <dd>{activeRole}</dd>
          </div>
          {session?.matricule && (
            <div>
              <dt>Matricule étudiant</dt>
              <dd><code>{session.matricule}</code></dd>
            </div>
          )}
          {studentDossier && (
            <div>
              <dt>Formation et classe</dt>
              <dd>{[studentDossier.filiere, studentDossier.niveau, studentDossier.groupe].filter(Boolean).join(' · ') || 'Non renseignée'}</dd>
            </div>
          )}
        </dl>
      </section>

      <section className="card card-full">
        <div className="card-header">
          <h2>Coordonnées personnelles</h2>
        </div>

        <ReviewedForm
          busy={saving}
          error={error}
          confirmLabel="Enregistrer dans mon dossier"
          fields={changedFields.length > 0 ? changedFields : [{ label: 'Profil', value: 'Confirmation des coordonnées actuelles' }]}
          consequence="Ces informations seront enregistrées dans votre dossier officiel ESCEN."
          validate={() => {
            if (isStudent && form.personalEmail.trim().toLowerCase().endsWith('@escen.university')) {
              return 'L’adresse institutionnelle @escen.university est attribuée par ESCEN et sert d’identifiant officiel de connexion. Elle ne peut en aucun cas être modifiée par l’étudiant. Renseignez uniquement votre adresse personnelle externe de contact (ex. Gmail, Yahoo).';
            }
            return null;
          }}
          onConfirm={event => {
            event.preventDefault();
            if (isStudent && form.personalEmail.trim().toLowerCase().endsWith('@escen.university')) {
              setError('L’adresse institutionnelle @escen.university est attribuée par ESCEN et sert d’identifiant officiel de connexion. Elle ne peut en aucun cas être modifiée par l’étudiant. Renseignez uniquement votre adresse personnelle externe de contact (ex. Gmail, Yahoo).');
              return;
            }
            setSaving(true);
            setError('');
            void saveOwnProfile(form, activeRole)
              .then(() => {
                portal.refreshCampus();
                portal.reportActionOutcome({
                  title: 'Profil mis à jour',
                  detail: 'Vos coordonnées et informations civiles sont désormais à jour dans votre dossier ESCEN.',
                });
              })
              .catch(cause => setError(cause instanceof Error ? cause.message : 'Enregistrement impossible.'))
              .finally(() => setSaving(false));
          }}
        >
          <div className="form-grid">
            {isStudent && (
              <label className="form-group card-full">
                Email professionnel institutionnel (M365)
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.25rem' }}>
                  <input
                    className="input"
                    type="email"
                    disabled
                    readOnly
                    value={studentProEmail}
                    style={{ backgroundColor: 'var(--surface-subtle, #f8fafc)', cursor: 'not-allowed', color: 'var(--text-muted, #64748b)', flex: 1 }}
                  />
                  <span className="badge badge-info" style={{ whiteSpace: 'nowrap' }}>Identifiant de connexion</span>
                </div>
                <small style={{ color: 'var(--text-muted, #64748b)', fontSize: '0.85rem', marginTop: '0.35rem', display: 'block' }}>
                  Attribué par ESCEN et utilisé pour vous connecter à la plateforme. En aucun cas modifiable par l’étudiant.
                </small>
              </label>
            )}
            <PhoneInput
              label="Numéro de téléphone"
              defaultCountry="TG-228"
              value={form.phone}
              onChange={phone => setForm(prev => ({ ...prev, phone }))}
            />
            <label className="form-group">
              Email personnel de contact (externe / privé)
              <input
                className="input"
                type="email"
                maxLength={255}
                placeholder="ex. nom.prenom@gmail.com"
                value={form.personalEmail}
                onChange={event => setForm(prev => ({ ...prev, personalEmail: event.target.value }))}
              />
              <small style={{ color: 'var(--text-muted, #64748b)', fontSize: '0.8rem', marginTop: '0.25rem', display: 'block' }}>
                {isStudent
                  ? 'Pour la récupération de compte et vos contacts privés. Ne saisissez pas votre adresse @escen.university.'
                  : 'Adresse externe de contact.'}
              </small>
            </label>
            <label className="form-group">
              Date de naissance
              <input
                className="input"
                type="date"
                max={new Date().toISOString().slice(0, 10)}
                value={form.birthDate}
                onChange={event => setForm(prev => ({ ...prev, birthDate: event.target.value }))}
              />
            </label>
            <label className="form-group">
              Genre
              <select
                className="select-input"
                value={form.gender}
                onChange={event => setForm(prev => ({ ...prev, gender: event.target.value }))}
              >
                <option value="">Non renseigné</option>
                <option value="F">Féminin</option>
                <option value="M">Masculin</option>
                <option value="Autre">Autre</option>
              </select>
            </label>
            <CountrySelect
              label="Nationalité"
              kind="nationality"
              value={form.nationality}
              onChange={nationality => setForm(prev => ({ ...prev, nationality }))}
            />
            <CountrySelect
              label="Pays de résidence"
              kind="country"
              value={form.country}
              onChange={country => setForm(prev => ({ ...prev, country }))}
            />
            <label className="form-group">
              Ville
              <input
                className="input"
                type="text"
                maxLength={160}
                placeholder="Ex. Lomé"
                value={form.city}
                onChange={event => setForm(prev => ({ ...prev, city: event.target.value }))}
              />
            </label>
            <label className="form-group card-full">
              Adresse de résidence (quartier, rue)
              <input
                className="input"
                type="text"
                maxLength={255}
                placeholder="Ex. Quartier Tokoin, Lomé"
                value={form.address}
                onChange={event => setForm(prev => ({ ...prev, address: event.target.value }))}
              />
            </label>
          </div>
          <DrawerActions>
            <button type="submit" className="btn btn-primary" disabled={saving || changedFields.length === 0}>
              Vérifier et enregistrer mes informations
            </button>
          </DrawerActions>
        </ReviewedForm>
      </section>
    </div>
  );
}
