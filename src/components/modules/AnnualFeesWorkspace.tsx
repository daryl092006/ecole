'use client';

import { useState, useEffect } from 'react';
import { usePortal } from '@/hooks/usePortal';
import { ROLES } from '@/types/permissions';
import PageHeader from '@/components/ui/PageHeader';
import ResponsiveTable from '@/components/ui/ResponsiveTable';
import WorkPage from '@/components/ui/WorkPage';
import ReviewedForm from '@/components/ui/ReviewedForm';
import DrawerActions from '@/components/ui/DrawerActions';
import { DrawerCloseButton } from '@/components/ui/DetailDrawer';
import LoadingState from '@/components/ui/LoadingState';
import ErrorState from '@/components/ui/ErrorState';
import ActionResult from '@/components/ui/ActionResult';
import { loadFinanceSettings, mutateFinanceSettings } from '@/services/financeSettingsService';
import type {
  FinanceSettingsDirectory,
  ScholarshipItem,
  FeeScheduleItem,
} from '@/types/financeSettings';

const money = (val: number) => `${val.toLocaleString('fr-FR')} FCFA`;

export default function AnnualFeesWorkspace() {
  const portal = usePortal();
  const { activeRole } = portal;

  const [activeTab, setActiveTab] = useState<'scholarships' | 'fees' | 'awards'>('scholarships');
  const [directory, setDirectory] = useState<FinanceSettingsDirectory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Modals state
  const [modalMode, setModalMode] = useState<
    'none' | 'create_scholarship' | 'edit_scholarship' | 'create_fee' | 'award_scholarship'
  >('none');
  const [selectedScholarship, setSelectedScholarship] = useState<ScholarshipItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');

  // Scholarship form state
  const [schCode, setSchCode] = useState('');
  const [schName, setSchName] = useState('');
  const [schKind, setSchKind] = useState<'POURCENTAGE' | 'MONTANT_FIXE'>('POURCENTAGE');
  const [schPercent, setSchPercent] = useState('50');
  const [schAmount, setSchAmount] = useState('');
  const [schReason, setSchReason] = useState('');

  // Fee schedule form state
  const [feeCategory, setFeeCategory] = useState<'SCOLARITE' | 'INSCRIPTION'>('SCOLARITE');
  const [feeProgramId, setFeeProgramId] = useState('');
  const [feeLevelId, setFeeLevelId] = useState('');
  const [feeMode, setFeeMode] = useState('Présentiel');
  const [feeAmount, setFeeAmount] = useState('550000');
  const [feeReason, setFeeReason] = useState('');

  // Award scholarship form state
  const [awardEnrollmentId, setAwardEnrollmentId] = useState('');
  const [awardScholarshipId, setAwardScholarshipId] = useState('');
  const [awardValidFrom, setAwardValidFrom] = useState(new Date().toISOString().slice(0, 10));
  const [awardReason, setAwardReason] = useState('');

  // Search queries
  const [schQuery, setSchQuery] = useState('');
  const [feeQuery, setFeeQuery] = useState('');
  const [awardQuery, setAwardQuery] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    const yearId = portal.academicYearContext?.selectedYearId || undefined;
    loadFinanceSettings(activeRole, yearId)
      .then(data => {
        if (!active) return;
        setDirectory(data);
        setLoading(false);
      })
      .catch(err => {
        if (!active) return;
        setError(err.message || 'Impossible de charger la configuration financière.');
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [activeRole, portal.academicYearContext?.selectedYearId, reloadKey]);

  const canEdit = [ROLES.RAF, ROLES.IT, ROLES.DG].includes(activeRole as typeof ROLES.RAF);

  const closeModal = () => {
    setModalMode('none');
    setSelectedScholarship(null);
    setSchReason('');
    setFeeReason('');
    setAwardReason('');
    setFormError('');
    setBusy(false);
  };

  const openCreateScholarship = () => {
    setSchCode('');
    setSchName('');
    setSchKind('POURCENTAGE');
    setSchPercent('50');
    setSchAmount('');
    setSchReason('');
    setFormError('');
    setModalMode('create_scholarship');
  };

  const openEditScholarship = (item: ScholarshipItem) => {
    setSelectedScholarship(item);
    setSchCode(item.code);
    setSchName(item.name);
    setSchKind(item.kind);
    setSchPercent(item.percent ? String(item.percent) : '');
    setSchAmount(item.amount ? String(item.amount) : '');
    setSchReason('');
    setFormError('');
    setModalMode('edit_scholarship');
  };

  const openCreateFee = () => {
    setFeeCategory('SCOLARITE');
    setFeeProgramId('');
    setFeeLevelId('');
    setFeeMode('Présentiel');
    setFeeAmount('550000');
    setFeeReason('');
    setFormError('');
    setModalMode('create_fee');
  };

  const openAwardScholarship = () => {
    setAwardEnrollmentId(directory?.enrolledStudents[0]?.enrollmentId || '');
    setAwardScholarshipId(directory?.scholarships.find(s => s.active)?.id || '');
    setAwardValidFrom(new Date().toISOString().slice(0, 10));
    setAwardReason('');
    setFormError('');
    setModalMode('award_scholarship');
  };

  const handleToggleScholarship = async (item: ScholarshipItem) => {
    if (!directory || !canEdit) return;
    const nextActive = !item.active;
    const actionDesc = nextActive ? 'Réactivation' : 'Désactivation';
    try {
      await mutateFinanceSettings(activeRole, {
        action: 'toggle_scholarship',
        revision: directory.revision,
        id: item.id,
        active: nextActive,
        reason: `${actionDesc} de la bourse ${item.code}`,
      });
      portal.refreshCampus();
      setReloadKey(k => k + 1);
      setNotice(`La bourse ${item.name} (${item.code}) est désormais ${nextActive ? 'active' : 'inactive'}.`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la modification.');
    }
  };

  const handleArchiveFee = async (item: FeeScheduleItem) => {
    if (!directory || !canEdit) return;
    if (!window.confirm(`Confirmez-vous l'archivage de ce tarif de ${money(item.amount)} ?`)) return;
    try {
      await mutateFinanceSettings(activeRole, {
        action: 'archive_fee_schedule',
        revision: directory.revision,
        id: item.id,
        reason: `Archivage du tarif ${item.category} ${item.amount} FCFA`,
      });
      portal.refreshCampus();
      setReloadKey(k => k + 1);
      setNotice('Le tarif a été archivé.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l’archivage.');
    }
  };

  if (loading) {
    return <LoadingState label="Chargement des tarifs, tranches et bourses…" variant="table" />;
  }

  if (error && !directory) {
    return <ErrorState title="Finances indisponibles" message={error} onRetry={() => setReloadKey(k => k + 1)} />;
  }

  const scholarshipsList = (directory?.scholarships || []).filter(
    s =>
      s.code.toLowerCase().includes(schQuery.toLowerCase()) ||
      s.name.toLowerCase().includes(schQuery.toLowerCase())
  );

  const feeList = (directory?.feeSchedules || []).filter(
    f =>
      f.category.toLowerCase().includes(feeQuery.toLowerCase()) ||
      (f.programName && f.programName.toLowerCase().includes(feeQuery.toLowerCase())) ||
      (f.levelName && f.levelName.toLowerCase().includes(feeQuery.toLowerCase()))
  );

  const awardList = (directory?.scholarshipAwards || []).filter(
    a =>
      a.studentMatricule.toLowerCase().includes(awardQuery.toLowerCase()) ||
      a.studentName.toLowerCase().includes(awardQuery.toLowerCase()) ||
      a.scholarshipName.toLowerCase().includes(awardQuery.toLowerCase()) ||
      a.scholarshipCode.toLowerCase().includes(awardQuery.toLowerCase())
  );

  return (
    <div className="workspace-stack">
      <PageHeader
        eyebrow="FINANCES & COMPTABILITÉ"
        title="Tarifs, Tranches & Bourses"
        description="Configuration centrale des grilles tarifaires annuelles, des modalités d'échéanciers (1, 3, 4 ou 10 tranches) et du catalogue des bourses et partenariats."
      >
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {activeTab === 'scholarships' && canEdit && (
            <button type="button" className="btn btn-primary" onClick={openCreateScholarship}>
              + Nouvelle bourse / partenariat
            </button>
          )}
          {activeTab === 'fees' && canEdit && (
            <button type="button" className="btn btn-primary" onClick={openCreateFee}>
              + Configurer un tarif annuel
            </button>
          )}
          {activeTab === 'awards' && canEdit && (
            <button type="button" className="btn btn-primary" onClick={openAwardScholarship}>
              + Attribuer une bourse
            </button>
          )}
        </div>
      </PageHeader>

      {notice && (
        <ActionResult title="Opération effectuée" onDismiss={() => setNotice(null)}>
          <p>{notice}</p>
        </ActionResult>
      )}

      {error && (
        <ActionResult title="Erreur" onDismiss={() => setError(null)}>
          <p>{error}</p>
        </ActionResult>
      )}

      {/* KPI Cards */}
      <div className="kpi-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="kpi-card">
          <span className="kpi-label">Bourses & Partenariats</span>
          <strong className="kpi-value">{directory?.scholarships.length || 0}</strong>
          <span className="cell-sub">
            {(directory?.scholarships.filter(s => s.active) || []).length} actives
          </span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Tarifs configurés</span>
          <strong className="kpi-value">{directory?.feeSchedules.length || 0}</strong>
          <span className="cell-sub">Pour {directory?.selectedYearCode || 'l’année en cours'}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Bourses attribuées</span>
          <strong className="kpi-value">{directory?.scholarshipAwards.length || 0}</strong>
          <span className="cell-sub">Étudiants bénéficiaires audités</span>
        </div>
      </div>

      {/* Navigation tabs */}
      <div className="section-tabs" role="tablist" style={{ marginBottom: '1.5rem' }}>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'scholarships'}
          className={`btn ${activeTab === 'scholarships' ? 'btn-primary' : ''}`}
          onClick={() => setActiveTab('scholarships')}
        >
          Bourses & Partenariats ({directory?.scholarships.length || 0})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'fees'}
          className={`btn ${activeTab === 'fees' ? 'btn-primary' : ''}`}
          onClick={() => setActiveTab('fees')}
        >
          Tarifs & Tranches ({directory?.feeSchedules.length || 0})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'awards'}
          className={`btn ${activeTab === 'awards' ? 'btn-primary' : ''}`}
          onClick={() => setActiveTab('awards')}
        >
          Attributions ({directory?.scholarshipAwards.length || 0})
        </button>
      </div>

      {/* TAB 1: BOURSES & PARTENARIATS */}
      {activeTab === 'scholarships' && (
        <section className="card">
          <div
            className="card-header"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.75rem',
              padding: '1rem 1.25rem',
              borderBottom: '1px solid var(--border)',
            }}
          >
            <h2 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>Catalogue des bourses et partenariats</h2>
            <div style={{ maxWidth: '320px', width: '100%' }}>
              <input
                type="search"
                className="search-input"
                placeholder="Rechercher par code ou nom…"
                value={schQuery}
                onChange={e => setSchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="table-wrap">
            <ResponsiveTable className="data-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Intitulé & Partenariat</th>
                  <th>Nature de remise</th>
                  <th>Valeur</th>
                  <th>Bénéficiaires</th>
                  <th>Statut</th>
                  {canEdit && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {!scholarshipsList.length ? (
                  <tr>
                    <td colSpan={canEdit ? 7 : 6}>Aucune bourse trouvée.</td>
                  </tr>
                ) : (
                  scholarshipsList.map(item => (
                    <tr key={item.id}>
                      <td>
                        <strong>{item.code}</strong>
                      </td>
                      <td>{item.name}</td>
                      <td>
                        <span className="pill pill-default">
                          {item.kind === 'POURCENTAGE' ? 'Pourcentage (%)' : 'Montant fixe'}
                        </span>
                      </td>
                      <td>
                        <strong>
                          {item.kind === 'POURCENTAGE'
                            ? `${item.percent}%`
                            : item.amount != null
                            ? money(item.amount)
                            : '-'}
                        </strong>
                      </td>
                      <td>{item.awardCount ?? 0} étudiant(s)</td>
                      <td>
                        <span className={`pill ${item.active ? 'pill-success' : 'pill-default'}`}>
                          {item.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      {canEdit && (
                        <td>
                          <div className="btn-group">
                            <button
                              type="button"
                              className="btn btn-sm btn-outline"
                              onClick={() => openEditScholarship(item)}
                            >
                              Modifier
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline"
                              onClick={() => handleToggleScholarship(item)}
                            >
                              {item.active ? 'Désactiver' : 'Activer'}
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </ResponsiveTable>
          </div>
        </section>
      )}

      {/* TAB 2: TARIFS & TRANCHES */}
      {activeTab === 'fees' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Modalités types box */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', fontWeight: 600 }}>
              Modalités de découpage des tranches (Règlement financier ESCEN)
            </h3>
            <p className="cell-sub" style={{ margin: '0 0 1rem 0' }}>
              Les contrats d’études générés appliquent ces découpages types selon l’échéancier choisi lors de l’inscription :
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div style={{ padding: '0.85rem 1rem', background: 'var(--surface-alt)', border: '1px solid var(--border)', borderRadius: '8px' }}>
                <strong style={{ color: 'var(--text-primary)' }}>Annuel (1 tranche)</strong>
                <div className="cell-sub" style={{ marginTop: '0.25rem' }}>100% de la scolarité à la rentrée (ex: Octobre ou Mars).</div>
              </div>
              <div style={{ padding: '0.85rem 1rem', background: 'var(--surface-alt)', border: '1px solid var(--border)', borderRadius: '8px' }}>
                <strong style={{ color: 'var(--text-primary)' }}>Trimestriel (3 tranches)</strong>
                <div className="cell-sub" style={{ marginTop: '0.25rem' }}>3 versements égaux (ex: Octobre, Décembre, Février).</div>
              </div>
              <div style={{ padding: '0.85rem 1rem', background: 'var(--surface-alt)', border: '1px solid var(--border)', borderRadius: '8px' }}>
                <strong style={{ color: 'var(--text-primary)' }}>Bi-mensuel (4 tranches)</strong>
                <div className="cell-sub" style={{ marginTop: '0.25rem' }}>4 versements réguliers (ex: M3, M5, M7, M9 de 25% chacun).</div>
              </div>
              <div style={{ padding: '0.85rem 1rem', background: 'var(--surface-alt)', border: '1px solid var(--border)', borderRadius: '8px' }}>
                <strong style={{ color: 'var(--text-primary)' }}>Mensuel (8 à 10 tranches)</strong>
                <div className="cell-sub" style={{ marginTop: '0.25rem' }}>Mensualités étalées sur toute l’année académique.</div>
              </div>
            </div>
          </div>

          <div className="card">
            <div
              className="card-header"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.75rem',
                padding: '1rem 1.25rem',
                borderBottom: '1px solid var(--border)',
              }}
            >
              <h2 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>Grille tarifaire annuelle</h2>
              <div style={{ maxWidth: '320px', width: '100%' }}>
                <input
                  type="search"
                  className="search-input"
                  placeholder="Filtrer par filière, niveau…"
                  value={feeQuery}
                  onChange={e => setFeeQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="table-wrap">
              <ResponsiveTable className="data-table">
                <thead>
                  <tr>
                    <th>Nature de frais</th>
                    <th>Montant</th>
                    <th>Filière concernée</th>
                    <th>Niveau</th>
                    <th>Mode</th>
                    {canEdit && <th>Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {!feeList.length ? (
                    <tr>
                      <td colSpan={canEdit ? 6 : 5}>
                        Aucun tarif configuré pour cette année. Utilisez le bouton ci-dessus pour ajouter les frais d’inscription ou de scolarité.
                      </td>
                    </tr>
                  ) : (
                    feeList.map(item => (
                      <tr key={item.id}>
                        <td>
                          <span className={`pill ${item.category === 'INSCRIPTION' ? 'pill-warning' : 'pill-default'}`}>
                            {item.category === 'INSCRIPTION' ? 'Frais d’inscription' : 'Scolarité'}
                          </span>
                        </td>
                        <td>
                          <strong>{money(item.amount)}</strong>
                        </td>
                        <td>{item.programName || 'Toutes les filières'}</td>
                        <td>{item.levelName || 'Tous les niveaux'}</td>
                        <td>{item.deliveryMode || 'Présentiel'}</td>
                        {canEdit && (
                          <td>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline btn-danger"
                              onClick={() => handleArchiveFee(item)}
                            >
                              Archiver
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </ResponsiveTable>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: BOURSES ATTRIBUÉES */}
      {activeTab === 'awards' && (
        <section className="card">
          <div
            className="card-header"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.75rem',
              padding: '1rem 1.25rem',
              borderBottom: '1px solid var(--border)',
            }}
          >
            <h2 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>Bourses attribuées aux étudiants (2026-2027)</h2>
            <div style={{ maxWidth: '320px', width: '100%' }}>
              <input
                type="search"
                className="search-input"
                placeholder="Rechercher par matricule ou étudiant…"
                value={awardQuery}
                onChange={e => setAwardQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="table-wrap">
            <ResponsiveTable className="data-table">
              <thead>
                <tr>
                  <th>Matricule</th>
                  <th>Étudiant</th>
                  <th>Formation & Niveau</th>
                  <th>Bourse / Partenariat</th>
                  <th>Valeur</th>
                  <th>Prise d’effet</th>
                </tr>
              </thead>
              <tbody>
                {!awardList.length ? (
                  <tr>
                    <td colSpan={6}>Aucune bourse attribuée pour l’année sélectionnée.</td>
                  </tr>
                ) : (
                  awardList.map(item => (
                    <tr key={item.id}>
                      <td>
                        <strong>{item.studentMatricule}</strong>
                      </td>
                      <td>{item.studentName}</td>
                      <td>
                        {item.programName} · {item.levelName}
                      </td>
                      <td>
                        <span className="pill pill-default">{item.scholarshipName}</span> ({item.scholarshipCode})
                      </td>
                      <td>
                        <strong>{item.scholarshipValue}</strong>
                      </td>
                      <td>{item.validFrom}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </ResponsiveTable>
          </div>
        </section>
      )}

      {/* MODAL 1 : CRÉATION DE BOURSE */}
      {modalMode === 'create_scholarship' && directory && (
        <WorkPage title="Nouvelle bourse ou partenariat" onClose={closeModal}>
          <ReviewedForm
            busy={busy}
            error={formError}
            confirmLabel="Enregistrer la bourse"
            consequence="Cette bourse ou ce partenariat sera disponible dans le catalogue et pourra être attribué aux contrats d'études des étudiants."
            fields={[
              { label: 'Code unique', value: schCode.toUpperCase() },
              { label: 'Intitulé', value: schName },
              { label: 'Type de remise', value: schKind === 'POURCENTAGE' ? 'Pourcentage (%)' : 'Montant fixe (FCFA)' },
              {
                label: 'Valeur',
                value: schKind === 'POURCENTAGE' ? `${schPercent}%` : money(Number(schAmount || 0)),
              },
              { label: 'Motif', value: schReason },
            ]}
            validate={() => {
              if (!schCode.trim()) return 'Le code de la bourse est obligatoire.';
              if (!schName.trim()) return 'L’intitulé de la bourse est obligatoire.';
              if (schKind === 'POURCENTAGE' && (!schPercent || Number(schPercent) <= 0 || Number(schPercent) > 100)) {
                return 'Le pourcentage doit être compris entre 1 et 100%.';
              }
              if (schKind === 'MONTANT_FIXE' && (!schAmount || Number(schAmount) <= 0)) {
                return 'Le montant fixe doit être un entier positif.';
              }
              if (schReason.trim().length < 3) return 'Le motif doit comporter au moins 3 caractères.';
              return null;
            }}
            onConfirm={async event => {
              event.preventDefault();
              setBusy(true);
              setFormError('');
              try {
                const pct = schKind === 'POURCENTAGE' ? Number(schPercent) : undefined;
                const amt = schKind === 'MONTANT_FIXE' ? Number(schAmount) : undefined;
                await mutateFinanceSettings(activeRole, {
                  action: 'create_scholarship',
                  revision: directory.revision,
                  code: schCode.trim().toUpperCase(),
                  name: schName.trim(),
                  kind: schKind,
                  percent: pct,
                  amount: amt,
                  reason: schReason.trim(),
                });
                portal.refreshCampus();
                setReloadKey(k => k + 1);
                setNotice(`Bourse ${schName} (${schCode}) créée avec succès.`);
                closeModal();
              } catch (err: unknown) {
                setFormError(err instanceof Error ? err.message : 'Erreur d’enregistrement.');
              } finally {
                setBusy(false);
              }
            }}
          >
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label htmlFor="sch-code" className="field-label">
                Code de la bourse / partenariat *
              </label>
              <input
                id="sch-code"
                type="text"
                className="field-input"
                required
                placeholder="Ex: PART-NEHEMIAH-50, BOURSE-EXCELLENCE"
                value={schCode}
                onChange={e => setSchCode(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label htmlFor="sch-name" className="field-label">
                Intitulé / Nom du partenaire *
              </label>
              <input
                id="sch-name"
                type="text"
                className="field-input"
                required
                placeholder="Ex: Partenariat Nehemiah, Bourse d'Excellence ESCEN"
                value={schName}
                onChange={e => setSchName(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label htmlFor="sch-kind" className="field-label">
                Type de réduction *
              </label>
              <select
                id="sch-kind"
                className="field-input"
                value={schKind}
                onChange={e => setSchKind(e.target.value as 'POURCENTAGE' | 'MONTANT_FIXE')}
              >
                <option value="POURCENTAGE">Pourcentage (%)</option>
                <option value="MONTANT_FIXE">Montant fixe en FCFA</option>
              </select>
            </div>

            {schKind === 'POURCENTAGE' ? (
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label htmlFor="sch-percent" className="field-label">
                  Pourcentage de remise (entre 1% et 100%) *
                </label>
                <input
                  id="sch-percent"
                  type="number"
                  min="1"
                  max="100"
                  className="field-input"
                  required
                  placeholder="50"
                  value={schPercent}
                  onChange={e => setSchPercent(e.target.value)}
                />
              </div>
            ) : (
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label htmlFor="sch-amt" className="field-label">
                  Montant fixe de la remise (FCFA) *
                </label>
                <input
                  id="sch-amt"
                  type="number"
                  min="1"
                  className="field-input"
                  required
                  placeholder="200000"
                  value={schAmount}
                  onChange={e => setSchAmount(e.target.value)}
                />
              </div>
            )}

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label htmlFor="sch-reason" className="field-label">
                Motif d’enregistrement (justification pour l’audit) *
              </label>
              <textarea
                id="sch-reason"
                className="field-input"
                rows={2}
                required
                placeholder="Motif de création ou référence de la convention…"
                value={schReason}
                onChange={e => setSchReason(e.target.value)}
              />
            </div>

            <DrawerActions>
              <DrawerCloseButton className="btn btn-outline" onClose={closeModal}>
                Fermer
              </DrawerCloseButton>
              <button type="submit" className="btn btn-primary">
                Vérifier avant d’enregistrer
              </button>
            </DrawerActions>
          </ReviewedForm>
        </WorkPage>
      )}

      {/* MODAL 2 : MODIFICATION DE BOURSE */}
      {modalMode === 'edit_scholarship' && selectedScholarship && directory && (
        <WorkPage title={`Modifier ${selectedScholarship.code}`} onClose={closeModal}>
          <ReviewedForm
            busy={busy}
            error={formError}
            confirmLabel="Enregistrer les modifications"
            consequence="Les modifications s'appliqueront aux prochaines attributions. Les bourses déjà allouées conservent leur instantané contractuel."
            fields={[
              { label: 'Code', previous: selectedScholarship.code, value: schCode.toUpperCase() },
              { label: 'Intitulé', previous: selectedScholarship.name, value: schName },
              {
                label: 'Valeur',
                previous:
                  selectedScholarship.kind === 'POURCENTAGE'
                    ? `${selectedScholarship.percent}%`
                    : money(selectedScholarship.amount || 0),
                value: schKind === 'POURCENTAGE' ? `${schPercent}%` : money(Number(schAmount || 0)),
              },
              { label: 'Motif', value: schReason },
            ]}
            validate={() => {
              if (!schCode.trim()) return 'Le code est obligatoire.';
              if (!schName.trim()) return 'L’intitulé est obligatoire.';
              if (schReason.trim().length < 3) return 'Le motif doit comporter au moins 3 caractères.';
              return null;
            }}
            onConfirm={async event => {
              event.preventDefault();
              setBusy(true);
              setFormError('');
              try {
                const pct = schKind === 'POURCENTAGE' ? Number(schPercent) : undefined;
                const amt = schKind === 'MONTANT_FIXE' ? Number(schAmount) : undefined;
                await mutateFinanceSettings(activeRole, {
                  action: 'update_scholarship',
                  revision: directory.revision,
                  id: selectedScholarship.id,
                  code: schCode.trim().toUpperCase(),
                  name: schName.trim(),
                  kind: schKind,
                  percent: pct,
                  amount: amt,
                  active: selectedScholarship.active,
                  reason: schReason.trim(),
                });
                portal.refreshCampus();
                setReloadKey(k => k + 1);
                setNotice(`Bourse ${schName} mise à jour.`);
                closeModal();
              } catch (err: unknown) {
                setFormError(err instanceof Error ? err.message : 'Erreur d’enregistrement.');
              } finally {
                setBusy(false);
              }
            }}
          >
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label htmlFor="edit-sch-code" className="field-label">
                Code *
              </label>
              <input
                id="edit-sch-code"
                type="text"
                className="field-input"
                required
                value={schCode}
                onChange={e => setSchCode(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label htmlFor="edit-sch-name" className="field-label">
                Intitulé *
              </label>
              <input
                id="edit-sch-name"
                type="text"
                className="field-input"
                required
                value={schName}
                onChange={e => setSchName(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label htmlFor="edit-sch-kind" className="field-label">
                Type de réduction *
              </label>
              <select
                id="edit-sch-kind"
                className="field-input"
                value={schKind}
                onChange={e => setSchKind(e.target.value as 'POURCENTAGE' | 'MONTANT_FIXE')}
              >
                <option value="POURCENTAGE">Pourcentage (%)</option>
                <option value="MONTANT_FIXE">Montant fixe en FCFA</option>
              </select>
            </div>

            {schKind === 'POURCENTAGE' ? (
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label htmlFor="edit-sch-pct" className="field-label">
                  Pourcentage *
                </label>
                <input
                  id="edit-sch-pct"
                  type="number"
                  min="1"
                  max="100"
                  className="field-input"
                  required
                  value={schPercent}
                  onChange={e => setSchPercent(e.target.value)}
                />
              </div>
            ) : (
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label htmlFor="edit-sch-amt" className="field-label">
                  Montant fixe (FCFA) *
                </label>
                <input
                  id="edit-sch-amt"
                  type="number"
                  min="1"
                  className="field-input"
                  required
                  value={schAmount}
                  onChange={e => setSchAmount(e.target.value)}
                />
              </div>
            )}

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label htmlFor="edit-sch-reason" className="field-label">
                Motif de modification *
              </label>
              <textarea
                id="edit-sch-reason"
                className="field-input"
                rows={2}
                required
                value={schReason}
                onChange={e => setSchReason(e.target.value)}
              />
            </div>

            <DrawerActions>
              <DrawerCloseButton className="btn btn-outline" onClose={closeModal}>
                Fermer
              </DrawerCloseButton>
              <button type="submit" className="btn btn-primary">
                Vérifier avant d’enregistrer
              </button>
            </DrawerActions>
          </ReviewedForm>
        </WorkPage>
      )}

      {/* MODAL 3 : CONFIGURATION D'UN TARIF ANNUEL */}
      {modalMode === 'create_fee' && directory && (
        <WorkPage title="Configurer un tarif annuel" onClose={closeModal}>
          <ReviewedForm
            busy={busy}
            error={formError}
            confirmLabel="Enregistrer le tarif"
            consequence="Le tarif configuré servira de base de facturation pour les contrats d'études de l'année sélectionnée."
            fields={[
              { label: 'Année universitaire', value: directory.selectedYearCode },
              { label: 'Type de frais', value: feeCategory === 'SCOLARITE' ? 'Scolarité' : 'Frais d’inscription' },
              {
                label: 'Filière',
                value: directory.programs.find(p => p.id === feeProgramId)?.name || 'Toutes les filières',
              },
              {
                label: 'Niveau',
                value: directory.levels.find(l => l.id === feeLevelId)?.name || 'Tous les niveaux',
              },
              { label: 'Montant net', value: money(Number(feeAmount || 0)) },
              { label: 'Motif', value: feeReason },
            ]}
            validate={() => {
              if (!feeAmount || Number(feeAmount) <= 0) return 'Le montant doit être un entier positif.';
              if (feeReason.trim().length < 3) return 'Le motif doit comporter au moins 3 caractères.';
              return null;
            }}
            onConfirm={async event => {
              event.preventDefault();
              setBusy(true);
              setFormError('');
              try {
                await mutateFinanceSettings(activeRole, {
                  action: 'create_fee_schedule',
                  revision: directory.revision,
                  academicYearId: directory.selectedYearId,
                  category: feeCategory,
                  programId: feeProgramId || null,
                  levelId: feeLevelId || null,
                  deliveryMode: feeMode || null,
                  amount: Number(feeAmount),
                  reason: feeReason.trim(),
                });
                portal.refreshCampus();
                setReloadKey(k => k + 1);
                setNotice(`Tarif de ${money(Number(feeAmount))} enregistré.`);
                closeModal();
              } catch (err: unknown) {
                setFormError(err instanceof Error ? err.message : 'Erreur d’enregistrement.');
              } finally {
                setBusy(false);
              }
            }}
          >
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label htmlFor="fee-cat" className="field-label">
                Nature des frais *
              </label>
              <select
                id="fee-cat"
                className="field-input"
                value={feeCategory}
                onChange={e => setFeeCategory(e.target.value as 'SCOLARITE' | 'INSCRIPTION')}
              >
                <option value="SCOLARITE">Frais de scolarité</option>
                <option value="INSCRIPTION">Frais d’inscription</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label htmlFor="fee-prog" className="field-label">
                Filière (facultative)
              </label>
              <select
                id="fee-prog"
                className="field-input"
                value={feeProgramId}
                onChange={e => setFeeProgramId(e.target.value)}
              >
                <option value="">Toutes les filières (Tarif commun)</option>
                {directory.programs.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label htmlFor="fee-lvl" className="field-label">
                Niveau d’études (facultatif)
              </label>
              <select
                id="fee-lvl"
                className="field-input"
                value={feeLevelId}
                onChange={e => setFeeLevelId(e.target.value)}
              >
                <option value="">Tous les niveaux</option>
                {directory.levels.map(l => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label htmlFor="fee-mode" className="field-label">
                Mode de formation
              </label>
              <select
                id="fee-mode"
                className="field-input"
                value={feeMode}
                onChange={e => setFeeMode(e.target.value)}
              >
                <option value="Présentiel">Présentiel</option>
                <option value="En ligne">En ligne</option>
                <option value="Hybride">Hybride</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label htmlFor="fee-amount" className="field-label">
                Montant en FCFA *
              </label>
              <input
                id="fee-amount"
                type="number"
                min="1000"
                step="1000"
                className="field-input"
                required
                value={feeAmount}
                onChange={e => setFeeAmount(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label htmlFor="fee-reason" className="field-label">
                Motif d’enregistrement *
              </label>
              <textarea
                id="fee-reason"
                className="field-input"
                rows={2}
                required
                placeholder="Motif de validation du tarif…"
                value={feeReason}
                onChange={e => setFeeReason(e.target.value)}
              />
            </div>

            <DrawerActions>
              <DrawerCloseButton className="btn btn-outline" onClose={closeModal}>
                Fermer
              </DrawerCloseButton>
              <button type="submit" className="btn btn-primary">
                Vérifier avant d’enregistrer
              </button>
            </DrawerActions>
          </ReviewedForm>
        </WorkPage>
      )}

      {/* MODAL 4 : ATTRIBUTION DE BOURSE */}
      {modalMode === 'award_scholarship' && directory && (
        <WorkPage title="Attribuer une bourse à un étudiant" onClose={closeModal}>
          <ReviewedForm
            busy={busy}
            error={formError}
            confirmLabel="Confirmer l’attribution"
            consequence="La bourse sera rattachée à l'inscription de l'étudiant pour cette année et calculera automatiquement les déductions sur son contrat financier."
            fields={[
              {
                label: 'Étudiant bénéficiaire',
                value: directory.enrolledStudents.find(s => s.enrollmentId === awardEnrollmentId)?.name || '-',
              },
              {
                label: 'Matricule',
                value: directory.enrolledStudents.find(s => s.enrollmentId === awardEnrollmentId)?.matricule || '-',
              },
              {
                label: 'Bourse attribuée',
                value: directory.scholarships.find(s => s.id === awardScholarshipId)?.name || '-',
              },
              { label: 'Date de prise d’effet', value: awardValidFrom },
              { label: 'Motif', value: awardReason },
            ]}
            validate={() => {
              if (!awardEnrollmentId) return 'Veuillez sélectionner un étudiant.';
              if (!awardScholarshipId) return 'Veuillez sélectionner une bourse.';
              if (!awardValidFrom) return 'La date d’effet est obligatoire.';
              if (awardReason.trim().length < 3) return 'Le motif doit comporter au moins 3 caractères.';
              return null;
            }}
            onConfirm={async event => {
              event.preventDefault();
              setBusy(true);
              setFormError('');
              try {
                await mutateFinanceSettings(activeRole, {
                  action: 'award_scholarship',
                  revision: directory.revision,
                  enrollmentId: awardEnrollmentId,
                  scholarshipId: awardScholarshipId,
                  validFrom: awardValidFrom,
                  reason: awardReason.trim(),
                });
                portal.refreshCampus();
                setReloadKey(k => k + 1);
                setNotice('La bourse a été attribuée avec succès.');
                closeModal();
              } catch (err: unknown) {
                setFormError(err instanceof Error ? err.message : 'Erreur lors de l’attribution.');
              } finally {
                setBusy(false);
              }
            }}
          >
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label htmlFor="awd-student" className="field-label">
                Étudiant inscrit ({directory.selectedYearCode}) *
              </label>
              <select
                id="awd-student"
                className="field-input"
                required
                value={awardEnrollmentId}
                onChange={e => setAwardEnrollmentId(e.target.value)}
              >
                {directory.enrolledStudents.map(s => (
                  <option key={s.enrollmentId} value={s.enrollmentId}>
                    [{s.matricule}] {s.name} — {s.levelName} ({s.programName})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label htmlFor="awd-sch" className="field-label">
                Bourse ou partenariat *
              </label>
              <select
                id="awd-sch"
                className="field-input"
                required
                value={awardScholarshipId}
                onChange={e => setAwardScholarshipId(e.target.value)}
              >
                {directory.scholarships
                  .filter(s => s.active)
                  .map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code}) — {s.kind === 'POURCENTAGE' ? `${s.percent}%` : money(s.amount || 0)}
                    </option>
                  ))}
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label htmlFor="awd-date" className="field-label">
                Date de prise d’effet *
              </label>
              <input
                id="awd-date"
                type="date"
                className="field-input"
                required
                value={awardValidFrom}
                onChange={e => setAwardValidFrom(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label htmlFor="awd-reason" className="field-label">
                Motif d’attribution *
              </label>
              <textarea
                id="awd-reason"
                className="field-input"
                rows={2}
                required
                placeholder="Ex: Décision de commission d'attribution de bourses…"
                value={awardReason}
                onChange={e => setAwardReason(e.target.value)}
              />
            </div>

            <DrawerActions>
              <DrawerCloseButton className="btn btn-outline" onClose={closeModal}>
                Fermer
              </DrawerCloseButton>
              <button type="submit" className="btn btn-primary">
                Vérifier avant d’attribuer
              </button>
            </DrawerActions>
          </ReviewedForm>
        </WorkPage>
      )}
    </div>
  );
}
