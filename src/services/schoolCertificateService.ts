import { escapeHtml as h } from '@/utils/printDocument';
import type { DatabaseRow, RelationalSnapshot } from '@/types/persistence';
import type { TranscriptDocument } from './transcriptDocumentService';
import { formatSubjectCode } from './resaoCodeService';
import { computeSubjectAverage } from './gradeCalculationService';
import { evaluationGradeValue } from './evaluationGradePolicy';

export interface SchoolCertificateInput {
  studentName: string;
  matricule: string;
  birthDate?: string;
  birthPlace?: string;
  nationality?: string;
  academicYear: string;
  program: string;
  level: string;
  group?: string;
  enrolledOn?: string;
  status?: string;
}

function fmtDateFr(value?: string): string {
  if (!value) return 'Non renseignée';
  const parsed = new Date(value.length === 10 ? `${value}T00:00:00Z` : value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('fr-FR', {
    timeZone: 'Africa/Lome',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export function schoolCertificateMarkup(input: SchoolCertificateInput): string {
  const today = fmtDateFr(new Date().toISOString().slice(0, 10));
  const ref = `CERT-${input.academicYear.replace(/[^0-9-]/g, '')}-${input.matricule}`;
  return `<div class="document-heading">
  <p style="font-size:11px;text-transform:uppercase;letter-spacing:0.06em;margin:0 0 4px;">République Togolaise · Travail – Liberté – Patrie<br>Ministère de l’Enseignement Supérieur et de la Recherche</p>
  <h1>ESCEN</h1>
  <p style="margin:2px 0 12px;font-size:12px;">École Supérieure de Commerce et d’Économie Numérique — Lomé, Togo</p>
  <h2>CERTIFICAT DE SCOLARITÉ</h2>
  <p>Année académique : <strong>${h(input.academicYear)}</strong> · Réf. : <strong>${h(ref)}</strong></p>
</div>
<p style="line-height:1.75;margin:18px 0;">
  Le Directeur Académique de l’<strong>École Supérieure de Commerce et d’Économie Numérique (ESCEN)</strong> certifie par la présente que l’étudiant(e) désigné(e) ci-dessous est régulièrement inscrit(e) au titre de l’année académique <strong>${h(input.academicYear)}</strong> :
</p>
<table>
  <tbody>
    <tr><th>Nom et Prénoms</th><td><strong>${h(input.studentName)}</strong></td></tr>
    <tr><th>Numéro Matricule</th><td><strong>${h(input.matricule)}</strong></td></tr>
    ${input.birthDate || input.birthPlace ? `<tr><th>Date et lieu de naissance</th><td>${input.birthDate ? `Le ${h(fmtDateFr(input.birthDate))}` : ''}${input.birthPlace ? ` à ${h(input.birthPlace)}` : ''}</td></tr>` : ''}
    ${input.nationality ? `<tr><th>Nationalité</th><td>${h(input.nationality)}</td></tr>` : ''}
    <tr><th>Filière / Parcours</th><td><strong>${h(input.program)}</strong></td></tr>
    <tr><th>Niveau d’études</th><td><strong>${h(input.level)}</strong></td></tr>
    ${input.group ? `<tr><th>Classe / Groupe</th><td>${h(input.group)}</td></tr>` : ''}
    ${input.enrolledOn ? `<tr><th>Date d’inscription</th><td>${h(fmtDateFr(input.enrolledOn))}</td></tr>` : ''}
    <tr><th>Statut académique</th><td>${h(input.status === 'REINSCRIT' ? 'Réinscrit(e) actif(ve)' : 'Inscrit(e) actif(ve)')}</td></tr>
  </tbody>
</table>
<p style="line-height:1.75;margin:18px 0;">
  En foi de quoi, le présent certificat de scolarité lui est délivré pour servir et valoir ce que de droit.
</p>
<div style="margin-top:34px;display:flex;justify-content:flex-end;">
  <div style="text-align:center;min-width:240px;">
    <p style="margin:0 0 6px;">Fait à Lomé, le ${h(today)}</p>
    <strong>Le Directeur Académique</strong>
    <p style="margin-top:48px;font-size:12px;color:#475569;">Signature et cachet officiel</p>
  </div>
</div>
<p class="document-footer">ESCEN · Certificat de scolarité ${h(ref)} · Matricule ${h(input.matricule)} · Année ${h(input.academicYear)}</p>`;
}

export function buildProvisionalTranscriptDocument(
  snapshot: RelationalSnapshot,
  matricule: string,
  selectedYearId?: string | null
): TranscriptDocument | null {
  const t = snapshot.tables;
  const studentRow = (t.students || []).find(s => s.matricule === matricule && !s.archived_at);
  if (!studentRow) return null;
  const personRow = (t.people || []).find(p => p.id === studentRow.person_id);
  const studentEnrollments = (t.enrollments || []).filter(e => e.student_id === studentRow.id);
  if (!studentEnrollments.length) return null;

  const targetEnrollment =
    studentEnrollments.find(e => {
      const off = (t.academic_offerings || []).find(o => o.id === e.offering_id);
      return selectedYearId ? off?.academic_year_id === selectedYearId : true;
    }) || studentEnrollments[0];

  const offering = (t.academic_offerings || []).find(o => o.id === targetEnrollment.offering_id);
  const year = offering ? (t.academic_years || []).find(y => y.id === offering.academic_year_id) : undefined;
  const level = offering ? (t.levels || []).find(l => l.id === offering.level_id) : undefined;
  const curriculum = offering ? (t.curricula || []).find(c => c.id === offering.curriculum_id) : undefined;
  const program = curriculum ? (t.programs || []).find(p => p.id === curriculum.program_id) : undefined;

  const semesters = (t.curriculum_semesters || [])
    .filter(s => s.curriculum_id === curriculum?.id && !s.archived_at)
    .sort((a, b) => Number(a.position || 0) - Number(b.position || 0));

  const units = (t.teaching_units || []).filter(u => u.curriculum_id === curriculum?.id && !u.archived_at);
  const components = (t.curriculum_components || []).filter(c => c.curriculum_id === curriculum?.id && !c.archived_at);
  const subjectsById = new Map((t.subjects || []).map(s => [String(s.id), s]));

  const candidates = (t.evaluation_candidates || []).filter(c => c.enrollment_id === targetEnrollment.id);
  const gradesByCand = new Map((t.grades || []).map(g => [String(g.candidate_id), g]));
  const evalsById = new Map((t.evaluations || []).filter(e => !e.cancelled_at && !e.archived_at).map(e => [String(e.id), e]));

  const usedCodes = new Set<string>();
  const uniqueCode = (baseCode: string, idx: number): string => {
    let candidateCode = baseCode.slice(0, 40) || `UE${idx + 1}`;
    let suffix = 2;
    while (usedCodes.has(candidateCode)) {
      candidateCode = `${baseCode.slice(0, 36)}-${suffix}`;
      suffix++;
    }
    usedCodes.add(candidateCode);
    return candidateCode;
  };

  let codeCounter = 0;
  const builtSemesters = semesters.flatMap(sem => {
    const semUnits = new Set(units.filter(u => u.semester_id === sem.id).map(u => String(u.id)));
    const semComps = components.filter(c => semUnits.has(String(c.unit_id)));
    if (!semComps.length) return [];

    const rows = semComps.map(comp => {
      codeCounter++;
      const subj = subjectsById.get(String(comp.subject_id));
      const subjName = String(subj?.name || comp.code || 'Matière');
      const rawCode = formatSubjectCode(comp.code || subj?.code, subjName, Number(sem.position) || undefined);
      const code = uniqueCode(rawCode, codeCounter);
      const credits = Number(comp.credits || 0);

      const compGradeInputs: { kind: string; value: number | null }[] = [];
      for (const cand of candidates) {
        const ev = evalsById.get(String(cand.evaluation_id));
        if (!ev) continue;
        const assign = (t.teaching_assignments || []).find(a => a.id === ev.assignment_id);
        const evCompId = ev.component_id || assign?.component_id;
        if (evCompId !== comp.id) continue;
        const gradeRow: DatabaseRow | undefined = gradesByCand.get(String(cand.id));
        const val = evaluationGradeValue(gradeRow);
        compGradeInputs.push({ kind: String(ev.kind || 'EXAMEN'), value: val });
      }

      const avg = compGradeInputs.length > 0 ? computeSubjectAverage(compGradeInputs).average : null;
      const validated = avg !== null ? avg >= 10 : null;
      return {
        code,
        name: subjName,
        credits,
        average: avg,
        validated,
      };
    });

    const totalCredits = rows.reduce((s, r) => s + r.credits, 0);
    const earnedCredits = rows.reduce((s, r) => s + (r.validated ? r.credits : 0), 0);
    return [{
      name: String(sem.name || `Semestre ${sem.position || ''}`),
      rows,
      totalCredits,
      earnedCredits,
    }];
  });

  if (!builtSemesters.length) return null;

  const totalCredits = builtSemesters.reduce((s, sem) => s + sem.totalCredits, 0);
  const earnedCredits = builtSemesters.reduce((s, sem) => s + sem.earnedCredits, 0);
  const allRowsWithAvg = builtSemesters.flatMap(sem => sem.rows).filter(r => r.average !== null);
  const weightedSum = allRowsWithAvg.reduce((s, r) => s + (r.average ?? 0) * (r.credits || 1), 0);
  const weightTotal = allRowsWithAvg.reduce((s, r) => s + (r.credits || 1), 0);
  const overallAvg = allRowsWithAvg.length > 0 && weightTotal > 0 ? Math.round((weightedSum / weightTotal) * 100) / 100 : null;
  const mention =
    overallAvg === null
      ? null
      : overallAvg >= 16
      ? 'Très Bien'
      : overallAvg >= 14
      ? 'Bien'
      : overallAvg >= 12
      ? 'Assez Bien'
      : overallAvg >= 10
      ? 'Passable'
      : 'Insuffisant';

  return {
    institution: {
      name: 'ESCEN — École Supérieure de Commerce et d’Économie Numérique',
      approval: 'Arrêté Ministériel N° 045/MESR/SG/DES',
      footer: 'ESCEN Lomé, Togo · Tél : (+228) 91 21 53 05 · contact@escen.university · www.escen.university',
    },
    student: {
      name: [personRow?.firstname, personRow?.lastname].filter(Boolean).join(' ') || matricule,
      matricule,
      birthDate: personRow?.birth_date ? String(personRow.birth_date).slice(0, 10) : '',
      birthPlace: personRow?.birth_place ? String(personRow.birth_place) : '',
    },
    academicYear: String(year?.name || year?.code || '2026-2027'),
    level: String(level?.name || 'Niveau'),
    program: String(program?.name || 'Filière'),
    semesters: builtSemesters,
    totalCredits,
    earnedCredits,
    average: overallAvg,
    mention,
    city: 'Lomé',
    director: 'Direction Académique ESCEN',
    signatoryTitle: 'Le Directeur Académique',
    reference: `REL-PROV-${String(year?.code || '2026-2027')}-${matricule}`,
    issuedAt: new Date().toISOString().slice(0, 10),
  };
}
