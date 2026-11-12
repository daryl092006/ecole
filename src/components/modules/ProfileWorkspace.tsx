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
import LoadingState from '@/components/ui/LoadingState';
import { loadOwnProfile, saveOwnProfile, type OwnProfileData } from '@/services/remoteCampusService';
import { isTogoleseNationality } from '@/services/firstLoginService';
import { displayedPhoneNumber } from '@/services/phoneNumberService';
import { ROLE_COLORS } from '@/hooks/useAppState';
import { Mail, Shield, KeyRound, AlertCircle, CheckCircle2 } from 'lucide-react';

const FIELD_LABELS = {
  phone: 'Téléphone',
  personalEmail: 'Email personnel de contact',
  birthDate: 'Date de naissance',
  gender: 'Genre',
  nationality: 'Nationalité',
  nif: 'NIF',
  address: 'Adresse de résidence',
  city: 'Ville',
  country: 'Pays de résidence',
} as const;

export default function ProfileWorkspace() {
  const portal = usePortal();
  const { session, activeRole, relationalSnapshot } = portal;

  const [profile, setProfile] = useState<OwnProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Chargement des données autorisées du profil connecté
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setLoading(true);

    void loadOwnProfile(activeRole, controller.signal)
      .then(data => {
        if (!active) return;
        setProfile(data);
      })
      .catch(() => {
        if (!active) return;
        // Repli gracieux sur les données du snapshot si l'appel échoue
        const tables = relationalSnapshot.tables || {};
        const people = tables.people || [];
        const studentRow = session?.studentId
          ? (tables.students || []).find(r => r.id === session.studentId)
          : undefined;
        const matched = people.find(p => p.id === studentRow?.person_id)
          || people.find(p => session?.email && String(p.email || '').toLowerCase() === session.email.toLowerCase())
          || null;

        const isStud = Boolean(session?.studentId || session?.matricule || activeRole === 'Étudiant' || activeRole === 'Délégué');
        const studentInstEmail = session?.matricule ? `${session.matricule.toLowerCase()}@escen.university` : null;

        const matchedEmail = matched?.email ? String(matched.email) : '';
        setProfile({
          personId: matched?.id ? String(matched.id) : '',
          firstname: matched?.firstname ? String(matched.firstname) : (session?.name?.split(/\s+/)[0] || ''),
          lastname: matched?.lastname ? String(matched.lastname) : (session?.name?.split(/\s+/).slice(1).join(' ') || ''),
          loginEmail: (isStud ? studentInstEmail : session?.email) || matchedEmail,
          personalEmail: (matchedEmail && !matchedEmail.toLowerCase().endsWith('@escen.university')) ? matchedEmail : '',
          phone: matched?.phone ? String(matched.phone) : '',
          birthDate: matched?.birth_date ? String(matched.birth_date) : '',
          gender: matched?.gender ? String(matched.gender) : '',
          nationality: matched?.nationality ? String(matched.nationality) : '',
          nif: matched?.nif ? String(matched.nif) : '',
          address: matched?.address ? String(matched.address) : '',
          city: matched?.city ? String(matched.city) : '',
          country: matched?.country ? String(matched.country) : '',
          matricule: session?.matricule || null,
          institutionalEmail: studentInstEmail,
          isStudent: isStud,
          isTeacher: Boolean(session?.teacherId || activeRole === 'Enseignant'),
        });
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [activeRole, session, relationalSnapshot.tables]);

  const isStudent = Boolean(profile?.isStudent || session?.studentId || session?.matricule || activeRole === 'Étudiant' || activeRole === 'Délégué');
  const isTeacher = Boolean(profile?.isTeacher || session?.teacherId || activeRole === 'Enseignant');

  const studentDossier = useMemo(() => {
    const matricule = profile?.matricule || session?.matricule;
    if (!matricule) return null;
    return portal.students.find(s => s.matricule === matricule) || null;
  }, [portal.students, profile?.matricule, session?.matricule]);

  const studentProEmail = profile?.institutionalEmail
    || (session?.matricule ? `${session.matricule.toLowerCase()}@escen.university` : '');

  const initialForm = useMemo(() => ({
    phone: displayedPhoneNumber(profile?.phone || ''),
    personalEmail: profile?.personalEmail || '',
    birthDate: profile?.birthDate || '',
    gender: profile?.gender || '',
    nationality: profile?.nationality || '',
    nif: profile?.nif || '',
    address: profile?.address || '',
    city: profile?.city || '',
    country: profile?.country || '',
  }), [profile]);

  const [form, setForm] = useState(initialForm);

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

  const displayFirstname = profile?.firstname || session?.name?.split(/\s+/)[0] || '';
  const displayLastname = profile?.lastname || session?.name?.split(/\s+/).slice(1).join(' ') || '';
  const displayFullname = `${displayFirstname} ${displayLastname}`.trim() || session?.name || 'Mon profil';
  const initial = Array.from(displayFullname)[0]?.toLocaleUpperCase('fr') || '?';
  const loginEmail = isStudent ? (studentProEmail || session?.email || '') : (profile?.loginEmail || session?.email || '');

  if (loading && !profile) {
    return (
      <div className="domain-workspace workspace-stack">
        <LoadingState label="Chargement de votre profil..." />
      </div>
    );
  }

  return (
    <div className="domain-workspace workspace-stack">
      <PageHeader
        eyebrow="ESPACE PERSONNEL"
        title="Mon profil et mes coordonnées"
        description="Consultez votre identité officielle enregistrée et mettez à jour vos coordonnées personnelles."
      >
        <Link className="btn btn-outline" href="/mot-de-passe-modifier">
          <KeyRound size={16} />
          <span>Modifier mon mot de passe</span>
        </Link>
        <Link className="btn btn-outline" href="/mon-espace/support">
          <AlertCircle size={16} />
          <span>Signaler une erreur d’état civil</span>
        </Link>
      </PageHeader>

      {/* Carte d'identité visuelle de profil */}
      <section className="profile-identity-banner card card-full">
        <div className="profile-identity-main">
          <div className="profile-avatar-large" aria-hidden="true">
            {initial}
          </div>
          <div className="profile-identity-details">
            <div className="profile-identity-title-row">
              <h2 className="profile-identity-fullname">{displayFullname}</h2>
              <span className="role-pill" style={{ borderColor: ROLE_COLORS[activeRole] || '#2563eb' }}>
                <span className="role-dot" style={{ backgroundColor: ROLE_COLORS[activeRole] || '#2563eb' }} />
                <span>{activeRole}</span>
              </span>
            </div>
            <div className="profile-identity-meta">
              {loginEmail && (
                <span className="profile-meta-item">
                  <Mail size={15} />
                  <span>{loginEmail}</span>
                </span>
              )}
              {isStudent && profile?.matricule && (
                <span className="profile-meta-item">
                  <Shield size={15} />
                  <span>Matricule : <code>{profile.matricule}</code></span>
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Badge carte étudiante officielle pour les étudiants */}
      {isStudent && (profile?.matricule || session?.matricule) && (
        <StudentIdCardBadge
          firstname={displayFirstname}
          lastname={displayLastname}
          matricule={profile?.matricule || session?.matricule || ''}
          filiere={studentDossier?.filiere || ''}
          niveau={studentDossier?.niveau || ''}
          groupe={studentDossier?.groupe || ''}
          academicYear={portal.academicYearContext?.years?.find(y => y.id === portal.academicYearContext?.selectedYearId)?.name || '2026-2027'}
        />
      )}

      {/* Section lecture seule : identité officielle */}
      <section className="card card-full">
        <div className="card-header">
          <div>
            <h2>Identité officielle et rattachement</h2>
            <p style={{ color: 'var(--text-muted, #64748b)', fontSize: '0.85rem', margin: '4px 0 0' }}>
              Données issues de votre dossier administratif officiel ESCEN.
            </p>
          </div>
        </div>
        <dl className="record-details-grid">
          <div>
            <dt>Prénom(s)</dt>
            <dd>{displayFirstname || 'Non renseigné'}</dd>
          </div>
          <div>
            <dt>Nom de famille</dt>
            <dd>{displayLastname || 'Non renseigné'}</dd>
          </div>
          <div>
            <dt>Compte de connexion officiel {isStudent ? '(Email pro M365)' : ''}</dt>
            <dd style={{ color: 'var(--primary, #0369a1)', fontWeight: 600 }}>
              {loginEmail || 'Non renseigné'}
            </dd>
          </div>
          <div>
            <dt>Rôle actif</dt>
            <dd>{activeRole}</dd>
          </div>
          {isStudent && profile?.matricule && (
            <div>
              <dt>Matricule étudiant</dt>
              <dd><code>{profile.matricule}</code></dd>
            </div>
          )}
          {isStudent && (
            <div>
              <dt>Email institutionnel (M365)</dt>
              <dd style={{ color: 'var(--primary, #0369a1)', fontWeight: 600 }}>
                {studentProEmail || 'Non renseigné'}
              </dd>
            </div>
          )}
          {studentDossier && (
            <div>
              <dt>Formation et classe</dt>
              <dd>{[studentDossier.filiere, studentDossier.niveau, studentDossier.groupe].filter(Boolean).join(' · ') || 'Non renseignée'}</dd>
            </div>
          )}
        </dl>
        <div className="profile-official-note">
          <small style={{ color: 'var(--text-muted, #64748b)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertCircle size={14} style={{ flexShrink: 0 }} />
            <span>Ces informations officielles sont protégées. Pour rectifier votre état civil ou votre filière, utilisez le bouton « Signaler une erreur d’état civil ».</span>
          </small>
        </div>
      </section>

      {/* Section modifiable : coordonnées personnelles */}
      <section className="card card-full">
        <div className="card-header">
          <div>
            <h2>Coordonnées personnelles</h2>
            <p style={{ color: 'var(--text-muted, #64748b)', fontSize: '0.85rem', margin: '4px 0 0' }}>
              Mettez à jour vos informations de contact et votre adresse de résidence.
            </p>
          </div>
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
            if (isTeacher && isTogoleseNationality(form.nationality) && !form.nif.trim()) {
              return 'Veuillez renseigner votre Numéro d’Identification Fiscale (NIF).';
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
                // Actualiser les données du profil
                void loadOwnProfile(activeRole).then(updated => setProfile(updated));
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
            {isTeacher && (isTogoleseNationality(form.nationality) || Boolean(form.nif)) && (
              <label className="form-group">
                Numéro d’Identification Fiscale (NIF)
                <input
                  className="input"
                  type="text"
                  required={isTogoleseNationality(form.nationality)}
                  maxLength={80}
                  placeholder="Ex. 1000123456"
                  value={form.nif}
                  onChange={event => setForm(prev => ({ ...prev, nif: event.target.value }))}
                />
              </label>
            )}
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
            {changedFields.length === 0 ? (
              <span style={{ color: 'var(--text-muted, #64748b)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle2 size={16} style={{ color: 'var(--success, #16a34a)' }} />
                <span>Vos coordonnées sont à jour dans votre dossier.</span>
              </span>
            ) : null}
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving || changedFields.length === 0}
            >
              {saving
                ? 'Enregistrement en cours…'
                : changedFields.length > 0
                ? `Vérifier et enregistrer (${changedFields.length} modification${changedFields.length > 1 ? 's' : ''})`
                : 'Vérifier et enregistrer mes informations'}
            </button>
          </DrawerActions>
        </ReviewedForm>
      </section>
    </div>
  );
}
