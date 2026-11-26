'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, Copy, ExternalLink, Library, Lock, Search, ShieldCheck, TriangleAlert, UserCheck } from 'lucide-react';
import { usePortal } from '@/hooks/usePortal';
import { roleHeaderValue } from '@/services/remoteCampusService';
import { academicYearRequestHeaders } from '@/services/academicYearSelection';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { ROLES } from '@/types/permissions';
import {
  computeLibraryAllocations,
  YOUSCRIBE_TEAMS,
  type EnrolledStudentCandidate,
  type StudentLibraryAllocation,
  type YouScribeTeamConfig,
} from '@/services/digitalLibraryService';
import PageHeader from '@/components/ui/PageHeader';
import WorkspaceSummary from '@/components/ui/WorkspaceSummary';
import DataPanel from '@/components/ui/DataPanel';
import ResponsiveTable from '@/components/ui/ResponsiveTable';
import LoadingState from '@/components/ui/LoadingState';

const YOUSCRIBE_LOGIN_URL = 'https://www.youscribe.com/Account/Login/LogOn';

interface DigitalLibraryDirectoryResponse {
  selectedYearId: string;
  isStudent: boolean;
  myAllocation: StudentLibraryAllocation | null;
  allocations: StudentLibraryAllocation[];
  teams: YouScribeTeamConfig[];
}

export default function DigitalLibraryWorkspace() {
  const portal = usePortal();
  const { activeRole, session, relationalSnapshot, academicYearContext, academicYearSelection } = portal;
  const [remote, setRemote] = useState<DigitalLibraryDirectoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedField, setCopiedField] = useState('');
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState('');
  const [teamFilter, setTeamFilter] = useState('');

  const isStudentRole = activeRole === ROLES.STUD || activeRole === ROLES.DEL;

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    void (async () => {
      try {
        const { data } = await getSupabaseBrowserClient().auth.getSession();
        if (!data.session) return;
        const response = await fetch('/api/digital-library', {
          signal: controller.signal,
          headers: {
            Authorization: `Bearer ${data.session.access_token}`,
            'x-escen-role': roleHeaderValue(activeRole),
            ...academicYearRequestHeaders(),
          },
          cache: 'no-store',
        });
        if (response.ok) {
          const json = (await response.json()) as DigitalLibraryDirectoryResponse;
          if (!controller.signal.aborted) setRemote(json);
        }
      } catch {
        // Fallback local ci-dessous
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [activeRole, academicYearSelection]);

  const currentYearId =
    remote?.selectedYearId ||
    academicYearContext?.selectedYearId ||
    academicYearContext?.currentYearId ||
    'cbd8ee33-b322-43b2-9876-99636e5891d8';

  const fallbackAllocations = useMemo<StudentLibraryAllocation[]>(() => {
    const tables = relationalSnapshot.tables || {};
    const students = tables.students || [];
    const people = tables.people || [];
    const enrollments = tables.enrollments || [];
    const offerings = tables.academic_offerings || [];
    const enrollmentGroups = tables.enrollment_groups || [];
    const groups = tables.groups || [];

    const peopleMap = new Map(people.map(p => [String(p.id), p]));
    const offeringsYearMap = new Map(offerings.map(o => [String(o.id), String(o.academic_year_id)]));
    const groupsMap = new Map(groups.map(g => [String(g.id), String(g.name || 'Classe')]));

    const result: EnrolledStudentCandidate[] = [];
    const seenStudents = new Set<string>();

    for (const enr of enrollments) {
      if (enr.archived_at) continue;
      const status = String(enr.status || '');
      if (!['INSCRIT', 'REINSCRIT'].includes(status)) continue;
      const offYearId = offeringsYearMap.get(String(enr.offering_id));
      if (currentYearId && offYearId && offYearId !== currentYearId) continue;

      const studentId = String(enr.student_id || '');
      if (!studentId || seenStudents.has(studentId)) continue;
      const student = students.find(s => String(s.id) === studentId && !s.archived_at);
      if (!student) continue;

      const person = peopleMap.get(String(student.person_id));
      const eg = enrollmentGroups.find(
        item => String(item.enrollment_id) === String(enr.id) && !item.valid_until && item.historical_only !== true
      );
      const groupName = eg ? (groupsMap.get(String(eg.group_id)) || 'Inscrit') : 'Inscrit';

      seenStudents.add(studentId);
      result.push({
        studentId,
        matricule: String(student.matricule || ''),
        firstname: String(person?.firstname || ''),
        lastname: String(person?.lastname || ''),
        groupName,
        enrollmentStatus: status,
      });
    }

    return computeLibraryAllocations(result);
  }, [relationalSnapshot.tables, currentYearId]);

  const allocations = remote?.allocations?.length ? remote.allocations : fallbackAllocations;

  const myAllocation = useMemo(() => {
    if (remote?.myAllocation) return remote.myAllocation;
    if (!session) return null;
    if (session.studentId) {
      const byId = allocations.find(a => a.studentId === session.studentId);
      if (byId) return byId;
    }
    if (session.matricule) {
      const byMat = allocations.find(a => a.matricule.toLowerCase() === session.matricule!.toLowerCase());
      if (byMat) return byMat;
    }
    return null;
  }, [remote?.myAllocation, allocations, session]);

  const copyValue = (key: string, value: string) => {
    void navigator.clipboard?.writeText(value);
    setCopiedField(key);
    setTimeout(() => setCopiedField(current => (current === key ? '' : current)), 2000);
  };

  const availableGroups = useMemo(
    () => Array.from(new Set(allocations.map(a => a.groupName).filter(Boolean))).sort(),
    [allocations]
  );

  const filteredAllocations = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allocations.filter(item => {
      if (groupFilter && item.groupName !== groupFilter) return false;
      if (teamFilter && item.teamEmail !== teamFilter) return false;
      if (q && !`${item.studentName} ${item.matricule} ${item.groupName} ${item.teamEmail}`.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [allocations, groupFilter, teamFilter, search]);

  if (loading && !remote && !fallbackAllocations.length) {
    return <LoadingState label="Chargement de vos accès à la bibliothèque numérique…" />;
  }

  return (
    <div className="domain-workspace workspace-stack">
      <PageHeader
        eyebrow="RESSOURCES DOCUMENTAIRES · ESCEN"
        title="Bibliothèque numérique YouScribe"
        description="Connectez-vous directement à la bibliothèque numérique YouScribe avec l’identifiant et le mot de passe attribués à votre inscription active pour l’année scolaire."
      >
        <a
          href={YOUSCRIBE_LOGIN_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primary"
        >
          <ExternalLink size={17} aria-hidden="true" />
          Se connecter à YouScribe
        </a>
      </PageHeader>

      {isStudentRole ? (
        myAllocation ? (
          <DataPanel
            title="Vos accès personnels à la bibliothèque numérique"
            description="Votre inscription est active pour l’année scolaire en cours. Utilisez l’identifiant et le mot de passe ci-dessous pour vous connecter directement sur YouScribe."
            meta={<span className="pill pill-success">Inscription régulière vérifiée · {myAllocation.matricule}</span>}
          >
            <div className="workspace-stack">
              <div className="record-details-grid">
                <div className="card" style={{ borderLeft: '4px solid var(--primary, #01b4d5)' }}>
                  <dt style={{ fontSize: '0.82rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Identifiant de connexion YouScribe
                  </dt>
                  <dd style={{ marginTop: '0.45rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <code style={{ fontSize: '1.05rem', fontWeight: 700 }}>{myAllocation.teamEmail}</code>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline"
                      onClick={() => copyValue('email', myAllocation.teamEmail)}
                    >
                      {copiedField === 'email' ? <><Check size={14} aria-hidden="true" /> Copié</> : <><Copy size={14} aria-hidden="true" /> Copier</>}
                    </button>
                  </dd>
                </div>

                <div className="card" style={{ borderLeft: '4px solid var(--primary, #01b4d5)' }}>
                  <dt style={{ fontSize: '0.82rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Mot de passe YouScribe
                  </dt>
                  <dd style={{ marginTop: '0.45rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <code style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary, #01b4d5)' }}>{myAllocation.youScribePassword}</code>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline"
                      onClick={() => copyValue('pwd', myAllocation.youScribePassword)}
                    >
                      {copiedField === 'pwd' ? <><Check size={14} aria-hidden="true" /> Copié</> : <><Copy size={14} aria-hidden="true" /> Copier</>}
                    </button>
                  </dd>
                </div>
              </div>

              <div className="card" style={{ background: 'var(--surface-subtle, #f8fafc)' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                  <div>
                    <h3 style={{ margin: '0 0 0.35rem 0', fontSize: '1rem' }}>Comment vous connecter ?</h3>
                    <p className="cell-sub" style={{ margin: 0, lineHeight: 1.6 }}>
                      1. Cliquez sur <strong>« Ouvrir la page de connexion YouScribe »</strong>.<br />
                      2. Saisissez l’adresse <code>{myAllocation.teamEmail}</code> et le mot de passe <code>{myAllocation.youScribePassword}</code>.<br />
                      3. Ne modifiez pas le mot de passe du compte afin de préserver l’accès de votre groupe de bibliothèque.
                    </p>
                  </div>
                  <div className="btn-group">
                    <a
                      href={YOUSCRIBE_LOGIN_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-primary"
                    >
                      <Lock size={16} aria-hidden="true" />
                      Ouvrir la page de connexion YouScribe
                      <ExternalLink size={15} aria-hidden="true" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </DataPanel>
        ) : (
          <DataPanel
            title="Accès réservé aux étudiants régulièrement inscrits"
            description="Les identifiants de la bibliothèque numérique YouScribe sont attribués uniquement aux étudiants régulièrement inscrits pour l’année scolaire en cours."
            meta={<span className="pill pill-warning">Inscription active requise</span>}
          >
            <div className="restricted-box" role="status" style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem' }}>
              <TriangleAlert size={22} aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <strong>Aucune inscription active détectée sur l’année scolaire sélectionnée</strong>
                <p style={{ margin: '0.35rem 0 0 0' }}>
                  Si vous êtes inscrit(e) cette année et que vos accès n’apparaissent pas encore, vérifiez que l’année scolaire <strong>2026-2027</strong> est bien sélectionnée en haut du portail ou contactez l’administration via l’onglet <strong>Support technique</strong>.
                </p>
              </div>
            </div>
          </DataPanel>
        )
      ) : (
        <>
          <WorkspaceSummary
            label="Attribution des accès YouScribe (Année 2026-2027)"
            items={[
              {
                label: 'Étudiants inscrits équipés',
                value: allocations.length.toLocaleString('fr-FR'),
                description: 'Étudiants régulièrement inscrits disposant de leurs accès visibles dans leur espace',
                icon: <UserCheck size={21} />,
                tone: 'primary',
              },
              {
                label: 'Comptes maintenus / réattribués',
                value: `${allocations.filter(a => a.allocationKind === 'TITULAIRE_INITIAL').length} / ${allocations.filter(a => a.allocationKind === 'REATTRIBUE_2026_2027').length}`,
                description: 'Titulaires réinscrits conservés · Places non réinscrites réattribuées aux nouveaux inscrits',
                icon: <ShieldCheck size={21} />,
              },
              {
                label: 'Comptes biblioteam actifs',
                value: `${YOUSCRIBE_TEAMS.length} équipes`,
                description: 'biblioteam@escen.university à biblioteam18@escen.university',
                icon: <Library size={21} />,
              },
            ]}
          />

          {allocations.length > 0 ? (
            <DataPanel
              title="Répartition des accès YouScribe aux étudiants régulièrement inscrits"
              description="Les étudiants non réinscrits cette année ont été retirés et leurs accès ont été automatiquement réattribués aux étudiants régulièrement inscrits en 2026-2027. Chaque étudiant inscrit voit directement son compte et son mot de passe dans son espace."
              meta={<span className="pill pill-default">{filteredAllocations.length} étudiant(s) inscrit(s)</span>}
              toolbar={
                <div className="panel-filter-grid">
                  <label className="form-group">
                    Rechercher un étudiant ou un compte
                    <span className="assessment-search-input">
                      <Search size={18} aria-hidden="true" />
                      <input
                        className="input"
                        type="search"
                        placeholder="Nom, matricule, biblioteam..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                      />
                    </span>
                  </label>
                  <label className="form-group">
                    Filtrer par classe
                    <select className="select-input" value={groupFilter} onChange={e => setGroupFilter(e.target.value)}>
                      <option value="">Toutes les classes ({availableGroups.length})</option>
                      {availableGroups.map(g => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </label>
                  <label className="form-group">
                    Filtrer par compte biblioteam
                    <select className="select-input" value={teamFilter} onChange={e => setTeamFilter(e.target.value)}>
                      <option value="">Tous les comptes ({YOUSCRIBE_TEAMS.length})</option>
                      {YOUSCRIBE_TEAMS.map(t => (
                        <option key={t.teamEmail} value={t.teamEmail}>{t.teamEmail}</option>
                      ))}
                    </select>
                  </label>
                </div>
              }
            >
              <div className="table-wrap">
                <ResponsiveTable className="data-table">
                  <thead>
                    <tr>
                      <th>Étudiant inscrit (2026-2027)</th>
                      <th>Classe</th>
                      <th>Compte YouScribe</th>
                      <th>Mot de passe YouScribe</th>
                      <th>Statut d’attribution</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAllocations.map(item => (
                      <tr key={item.studentId}>
                        <td>
                          <strong>{item.studentName}</strong>
                          <div className="cell-sub">{item.matricule} · {item.enrollmentStatus}</div>
                        </td>
                        <td>{item.groupName}</td>
                        <td>
                          <code>{item.teamEmail}</code>
                        </td>
                        <td>
                          <code style={{ fontWeight: 700, color: 'var(--primary, #01b4d5)' }}>{item.youScribePassword}</code>
                        </td>
                        <td>
                          {item.allocationKind === 'TITULAIRE_INITIAL' ? (
                            <span className="pill pill-success">Titulaire réinscrit conservé</span>
                          ) : (
                            <span className="pill pill-info" title={item.replacedHolderName ? `Place récupérée de : ${item.replacedHolderName}` : undefined}>
                              Place réattribuée (2026-2027)
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {!filteredAllocations.length && (
                      <tr>
                        <td colSpan={5}>Aucun étudiant inscrit ne correspond à ce filtre.</td>
                      </tr>
                    )}
                  </tbody>
                </ResponsiveTable>
              </div>
            </DataPanel>
          ) : (
            <DataPanel
              title="Accès Enseignant à la bibliothèque numérique YouScribe"
              description="Utilisez le compte ci-dessous pour consulter les ouvrages et manuels sur YouScribe."
              meta={<span className="pill pill-info">Accès pédagogique</span>}
            >
              <div className="record-details-grid">
                <div className="card" style={{ borderLeft: '4px solid var(--primary, #01b4d5)' }}>
                  <dt style={{ fontSize: '0.82rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Identifiant YouScribe</dt>
                  <dd style={{ marginTop: '0.45rem' }}>
                    <code style={{ fontSize: '1.05rem', fontWeight: 700 }}>{YOUSCRIBE_TEAMS[0].teamEmail}</code>
                  </dd>
                </div>
                <div className="card" style={{ borderLeft: '4px solid var(--primary, #01b4d5)' }}>
                  <dt style={{ fontSize: '0.82rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Mot de passe YouScribe</dt>
                  <dd style={{ marginTop: '0.45rem' }}>
                    <code style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary, #01b4d5)' }}>{YOUSCRIBE_TEAMS[0].youScribePassword}</code>
                  </dd>
                </div>
              </div>
            </DataPanel>
          )}
        </>
      )}
    </div>
  );
}
