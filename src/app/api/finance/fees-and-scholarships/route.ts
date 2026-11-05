import { z } from 'zod';
import { requireAccount, requirePermission, RequestError, errorResponse } from '@/server/auth';
import { resolveAcademicYear } from '@/server/academicYearContext';
import { filterRelationalSnapshot } from '@/services/persistentPermissionsService';
import type { PersistentChange, RelationalSnapshot } from '@/types/persistence';
import {ScholarshipApplicationError,previewScholarshipApplication,planScholarshipApplication,scholarshipTuitionLines,scholarshipContractContext} from '@/services/scholarshipApplicationService';
import {scholarshipFinancialEffect,scholarshipSavedTerms} from '@/services/scholarshipEffectService';
import type { FinanceSettingsDirectory } from '@/types/financeSettings';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const auth = await requireAccount(request);
    requirePermission(auth.context, 'finance.view');

    const result = await auth.client.rpc('escen_backend_snapshot');
    if (result.error) throw new RequestError(503, 'Données financières indisponibles.');
    const snapshot = filterRelationalSnapshot(result.data as RelationalSnapshot, auth.context);

    const yearContext = await resolveAcademicYear(request, auth.client, auth.context, snapshot);
    const selectedYearId = yearContext.selectedYearId;
    const selectedYear = snapshot.tables.academic_years?.find(y => y.id === selectedYearId);
    const selectedYearCode = selectedYear ? String(selectedYear.code || selectedYear.name || '') : '';

    // 1. Scholarships & award counts
    const awards = snapshot.tables.scholarship_awards || [];
    const scholarships = (snapshot.tables.scholarships || [])
      .map(row => ({
        id: row.id,
        code: String(row.code),
        name: String(row.name),
        kind: row.kind as 'POURCENTAGE' | 'MONTANT_FIXE',
        percent: row.percent != null ? Number(row.percent) : null,
        amount: row.amount != null ? Number(row.amount) : null,
        active: row.active === true,
        awardCount: awards.filter(a => a.scholarship_id === row.id && !a.revoked_at).length,
      }))
      .sort((a, b) => a.code.localeCompare(b.code));

    // 2. Fee schedules for the selected year
    const programsMap = new Map((snapshot.tables.programs || []).map(p => [p.id, String(p.name)]));
    const levelsMap = new Map((snapshot.tables.levels || []).map(l => [l.id, String(l.name)]));

    const feeSchedules = (snapshot.tables.annual_fee_schedules || [])
      .filter(row => !row.archived_at && (!selectedYearId || row.academic_year_id === selectedYearId))
      .map(row => ({
        id: row.id,
        academicYearId: String(row.academic_year_id),
        doubleDegree: row.double_degree===true,
        category: row.category as 'SCOLARITE' | 'INSCRIPTION',
        programId: row.program_id ? String(row.program_id) : null,
        programName: row.program_id ? programsMap.get(String(row.program_id)) || 'Filière' : 'Toutes les filières',
        levelId: row.level_id ? String(row.level_id) : null,
        levelName: row.level_id ? levelsMap.get(String(row.level_id)) || 'Niveau' : 'Tous les niveaux',
        deliveryMode: row.delivery_mode ? String(row.delivery_mode) : null,
        amount: Number(row.amount || 0),
        reason: row.reason ? String(row.reason) : undefined,
      }))
      .sort((a, b) => a.category.localeCompare(b.category) || b.amount - a.amount);

    // 3. Scholarship awards for the selected year
    const offeringsYear = new Set(
      (snapshot.tables.academic_offerings || [])
        .filter(o => !selectedYearId || o.academic_year_id === selectedYearId)
        .map(o => o.id)
    );
    const enrollmentsYear = (snapshot.tables.enrollments || []).filter(e => offeringsYear.has(String(e.offering_id)));
    const enrollmentsYearIds = new Set(enrollmentsYear.map(e => e.id));

    const studentsMap = new Map((snapshot.tables.students || []).map(s => [s.id, s]));
    const peopleMap = new Map((snapshot.tables.people || []).map(p => [p.id, p]));
    const offeringsMap = new Map((snapshot.tables.academic_offerings || []).map(o => [o.id, o]));
    const curriculaMap = new Map((snapshot.tables.curricula || []).map(c => [c.id, c]));

    const scholarshipAwards = awards
      .filter(a => enrollmentsYearIds.has(String(a.enrollment_id)) && !a.revoked_at)
      .map(a => {
        const enrollment = enrollmentsYear.find(e => e.id === a.enrollment_id);
        const student = enrollment ? studentsMap.get(String(enrollment.student_id)) : undefined;
        const person = student ? peopleMap.get(String(student.person_id)) : undefined;
        const offering = enrollment ? offeringsMap.get(String(enrollment.offering_id)) : undefined;
        const curriculum = offering ? curriculaMap.get(String(offering.curriculum_id)) : undefined;
        const programName = curriculum ? programsMap.get(String(curriculum.program_id)) : undefined;
        const levelName = offering ? levelsMap.get(String(offering.level_id)) : undefined;
        const scholarship = scholarshipSavedTerms(a,(snapshot.tables.scholarships || []).find(row=>row.id===a.scholarship_id));

        const val =
          scholarship?.kind === 'POURCENTAGE'
            ? `${scholarship.percent}%`
            : scholarship?.amount != null
            ? `${Number(scholarship.amount).toLocaleString('fr-FR')} FCFA`
            : '-';

        return {
          id: a.id,
          ...scholarshipFinancialEffect(snapshot,a),
          enrollmentId: String(a.enrollment_id),
          studentMatricule: String(student?.matricule || '-'),
          studentName: person ? `${person.lastname} ${person.firstname}` : 'Étudiant',
          programName: programName || 'Filière',
          levelName: levelName || 'Niveau',
          scholarshipId: String(a.scholarship_id),
          scholarshipCode: String(scholarship.code || ''),
          scholarshipName: String(scholarship.name || ''),
          scholarshipKind: (scholarship?.kind || 'POURCENTAGE') as 'POURCENTAGE' | 'MONTANT_FIXE',
          scholarshipValue: val,
          validFrom: String(a.valid_from),
          validUntil: a.valid_until ? String(a.valid_until) : null,
          reason: String(a.reason || ''),
        };
      })
      .sort((a, b) => a.studentName.localeCompare(b.studentName, 'fr'));

    // 4. Enrolled students list with their contract and scholarship status
    const scholarshipMap = new Map(scholarships.map(s => [s.id, s]));
    const scholarshipMap = new Map((snapshot.tables.scholarships || []).map(s => [s.id, s]));
    const contractsMap = new Map((snapshot.tables.financial_contracts || []).map(c => [String(c.enrollment_id), c]));
    const contractLines = snapshot.tables.contract_lines || [];
    const contractDiscounts = snapshot.tables.contract_discounts || [];
    const installments = snapshot.tables.installments || [];

    const enrolledStudents = enrollmentsYear
      .map(e => {
        const student = studentsMap.get(String(e.student_id));
        const person = student ? peopleMap.get(String(student.person_id)) : undefined;
        const offering = offeringsMap.get(String(e.offering_id));
        const curriculum = offering ? curriculaMap.get(String(offering.curriculum_id)) : undefined;

        const contract = contractsMap.get(String(e.id));
        const cLines = contract ? contractLines.filter(l => l.contract_id === contract.id) : [];
        const grossAmount = contract ? cLines.reduce((sum, l) => sum + Number(l.amount || 0), 0) : null;
        const cLineIds = new Set(cLines.map(l => String(l.id)));
        const cDiscounts = contractDiscounts.filter(d => cLineIds.has(String(d.line_id)));
        const discountAmount = cDiscounts.reduce((sum, d) => sum + Number(d.amount || 0), 0);
        const netAmount = grossAmount != null ? Math.max(0, grossAmount - discountAmount) : null;
        const cInsts = contract ? installments.filter(i => i.contract_id === contract.id) : [];
        const installmentsCount = cInsts.length;

        const studentAward = awards.find(a => a.enrollment_id === e.id && !a.revoked_at);
        const awardedSch = studentAward ? scholarshipMap.get(String(studentAward.scholarship_id)) : undefined;
        const hasScholarship = Boolean(studentAward);
        const scholarshipVal = awardedSch
          ? awardedSch.kind === 'POURCENTAGE'
            ? `${awardedSch.percent}%`
            : awardedSch.amount != null
            ? `${Number(awardedSch.amount).toLocaleString('fr-FR')} FCFA`
            : '-'
          : undefined;

        return {
          enrollmentId: e.id,
          scholarshipContext: scholarshipContractContext(snapshot,e.id),
          studentId: String(e.student_id),
          matricule: String(student?.matricule || ''),
          name: person ? `${person.lastname} ${person.firstname}` : 'Étudiant',
          programName: curriculum ? programsMap.get(String(curriculum.program_id)) || '' : '',
          levelName: offering ? levelsMap.get(String(offering.level_id)) || '' : '',
          hasScholarship,
          scholarshipCode: awardedSch ? String(awardedSch.code) : undefined,
          scholarshipName: awardedSch ? String(awardedSch.name) : undefined,
          scholarshipValue: scholarshipVal,
          scholarshipId: studentAward ? String(studentAward.scholarship_id) : undefined,
          contractId: contract ? String(contract.id) : undefined,
          contractStatus: contract ? String(contract.status) : 'NON_ETABLI',
          grossAmount,
          discountAmount,
          netAmount,
          installmentsCount: installmentsCount > 0 ? installmentsCount : undefined,
        };
      })
      .filter(s => s.matricule.length > 0)
      .sort((a, b) => a.name.localeCompare(b.name, 'fr'));

    const directory: FinanceSettingsDirectory = {
      revision: snapshot.revision,
      selectedYearId: selectedYearId || '',
      selectedYearCode,
      scholarships,
      feeSchedules,
      scholarshipAwards,
      programs: (snapshot.tables.programs || []).filter(p => !p.archived_at).map(p => ({ id: p.id, name: String(p.name), code: String(p.code), doubleDegreeEligible: p.double_degree_eligible===true })),
      levels: (snapshot.tables.levels || []).filter(l => !l.archived_at).map(l => ({ id: l.id, name: String(l.name), code: String(l.code) })),
      enrolledStudents,
    };

    return Response.json(directory, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return errorResponse(error instanceof ScholarshipApplicationError?new RequestError(409,error.message):error);
  }
}

const scholarshipSchema = z.object({
  action: z.literal('create_scholarship'),
  revision: z.number().int().nonnegative(),
  code: z.string().trim().min(2).max(64),
  name: z.string().trim().min(2).max(160),
  kind: z.enum(['POURCENTAGE', 'MONTANT_FIXE']),
  percent: z.number().min(1).max(100).optional(),
  amount: z.number().int().positive().optional(),
  reason: z.string().trim().min(3).max(1000),
});

const updateScholarshipSchema = z.object({
  action: z.literal('update_scholarship'),
  revision: z.number().int().nonnegative(),
  id: z.uuid(),
  code: z.string().trim().min(2).max(64),
  name: z.string().trim().min(2).max(160),
  kind: z.enum(['POURCENTAGE', 'MONTANT_FIXE']),
  percent: z.number().min(1).max(100).optional(),
  amount: z.number().int().positive().optional(),
  active: z.boolean(),
  reason: z.string().trim().min(3).max(1000),
});

const toggleScholarshipSchema = z.object({
  action: z.literal('toggle_scholarship'),
  revision: z.number().int().nonnegative(),
  id: z.uuid(),
  active: z.boolean(),
  reason: z.string().trim().min(3).max(1000),
});

const feeScheduleSchema = z.object({
  action: z.literal('create_fee_schedule'),
  doubleDegree: z.boolean().default(false),
  revision: z.number().int().nonnegative(),
  academicYearId: z.uuid(),
  category: z.enum(['SCOLARITE', 'INSCRIPTION']),
  programId: z.union([z.uuid(), z.null(), z.literal('')]).transform(v => (v ? v : null)).optional(),
  levelId: z.union([z.uuid(), z.null(), z.literal('')]).transform(v => (v ? v : null)).optional(),
  deliveryMode: z.union([z.string().trim().max(60), z.null()]).optional(),
  amount: z.number().int().positive().max(2147483647),
  reason: z.string().trim().min(3).max(1000),
});

const archiveFeeScheduleSchema = z.object({
  action: z.literal('archive_fee_schedule'),
  revision: z.number().int().nonnegative(),
  id: z.uuid(),
  reason: z.string().trim().min(3).max(1000),
});

const scholarshipSelectionSchema=z.object({
  revision:z.number().int().nonnegative(),enrollmentId:z.uuid(),scholarshipId:z.uuid(),
  validFrom:z.iso.date(),reason:z.string().trim().min(3).max(1000),
  calculationBasis:z.enum(['GROSS','REMAINING']),confirmStacking:z.boolean(),
});
const awardScholarshipSchema=scholarshipSelectionSchema.extend({
  action:z.literal('award_scholarship'),versionId:z.uuid(),
  reviewedReduction:z.number().int().positive(),reviewedTotal:z.number().int().nonnegative(),
  installments:z.array(z.object({id:z.uuid().optional(),dueOn:z.iso.date(),amount:z.number().int().nonnegative()}).strict()).max(80),
}).strict();
const previewScholarshipSchema=scholarshipSelectionSchema.extend({action:z.literal('preview_scholarship')}).strict();

const bodySchema = z.discriminatedUnion('action', [
  previewScholarshipSchema,
  scholarshipSchema,
  updateScholarshipSchema,
  toggleScholarshipSchema,
  feeScheduleSchema,
  archiveFeeScheduleSchema,
  awardScholarshipSchema,
]);

export async function POST(request: Request) {
  try {
    const auth = await requireAccount(request);
    requirePermission(auth.context, 'payment.record');
    requirePermission(auth.context, 'finance.view');

    const body = bodySchema.parse(await request.json());
    if(!['award_scholarship','preview_scholarship'].includes(body.action) && !auth.context.grants.some(grant=>!grant.site_id && !grant.group_id && !grant.academic_year_id))throw new RequestError(403,'Gestion globale du catalogue financier requise.');

    const result = await auth.client.rpc('escen_backend_snapshot');
    if (result.error) throw new RequestError(503, 'Données financières indisponibles.');
    const snapshot = ['award_scholarship','preview_scholarship'].includes(body.action)?filterRelationalSnapshot(result.data as RelationalSnapshot,auth.context):result.data as RelationalSnapshot;
    const year=await resolveAcademicYear(request,auth.client,auth.context,snapshot);
    if(['award_scholarship','preview_scholarship','create_fee_schedule','archive_fee_schedule'].includes(body.action) && !year.selectedYearId)throw new RequestError(409,'Sélectionnez une année précise.');

    if (body.revision !== snapshot.revision) {
      throw new RequestError(409, 'Les données ont été modifiées par un autre utilisateur. Actualisez la page.');
    }

    if(body.action==='preview_scholarship' || body.action==='award_scholarship'){
      const selectedYear=year.years.find(row=>row.id===year.selectedYearId);
      if(!selectedYear || selectedYear.status!=='OUVERTE')throw new RequestError(409,'Choisissez une année ouverte.');
      if(body.validFrom<selectedYear.starts_on || body.validFrom>selectedYear.ends_on)throw new RequestError(400,'La date d’effet doit appartenir à l’année de l’inscription.');
    }

    if(body.action==='preview_scholarship'){
      const enrollment=snapshot.tables.enrollments?.find(row=>row.id===body.enrollmentId);
      if(!snapshot.tables.academic_offerings?.some(row=>row.id===enrollment?.offering_id && row.academic_year_id===year.selectedYearId))throw new RequestError(409,'Inscription hors de l’année sélectionnée.');
      const tuition=scholarshipTuitionLines(snapshot,body.enrollmentId);
      const preview=previewScholarshipApplication(snapshot,{...body,lineIds:tuition.tuition.map(row=>row.id)});
      return Response.json({revision:snapshot.revision,preview:{versionId:preview.version.id,registration:scholarshipContractContext(snapshot,body.enrollmentId).registration || 0,base:preview.base,reduction:preview.reduction,oldTotal:preview.oldTotal,newTotal:preview.newTotal,paid:preview.paid,remaining:preview.remaining,unallocatedCredit:preview.unallocatedCredit,contractStatus:preview.version.status,installments:preview.suggestedInstallments}}, {headers:{'Cache-Control':'no-store'}});
    }

    const changes: PersistentChange[] = [];

    if (body.action === 'create_scholarship') {
      if (body.kind === 'POURCENTAGE' && (body.percent == null || body.percent <= 0 || body.percent > 100)) {
        throw new RequestError(400, 'Un pourcentage valide entre 1 et 100% est requis.');
      }
      if (body.kind === 'MONTANT_FIXE' && (body.amount == null || body.amount <= 0)) {
        throw new RequestError(400, 'Un montant fixe entier positif est requis.');
      }
      if (snapshot.tables.scholarships?.some(s => String(s.code || '').toLowerCase() === body.code.toLowerCase())) {
        throw new RequestError(409, `Une bourse avec le code "${body.code}" existe déjà.`);
      }

      changes.push({
        table: 'scholarships',
        operation: 'insert',
        record: {
          id: crypto.randomUUID(),
          code: body.code.toUpperCase(),
          name: body.name,
          kind: body.kind,
          percent: body.kind === 'POURCENTAGE' ? body.percent : null,
          amount: body.kind === 'MONTANT_FIXE' ? body.amount : null,
          active: true,
          reason: body.reason,
        },
      });
    } else if (body.action === 'update_scholarship') {
      const existing = snapshot.tables.scholarships?.find(s => s.id === body.id);
      if (!existing) throw new RequestError(404, 'Bourse introuvable.');

      if (body.kind === 'POURCENTAGE' && (body.percent == null || body.percent <= 0 || body.percent > 100)) {
        throw new RequestError(400, 'Un pourcentage valide entre 1 et 100% est requis.');
      }
      if (body.kind === 'MONTANT_FIXE' && (body.amount == null || body.amount <= 0)) {
        throw new RequestError(400, 'Un montant fixe entier positif est requis.');
      }

      changes.push({
        table: 'scholarships',
        operation: 'update',
        record: {
          id: body.id,
          code: body.code.toUpperCase(),
          name: body.name,
          kind: body.kind,
          percent: body.kind === 'POURCENTAGE' ? body.percent : null,
          amount: body.kind === 'MONTANT_FIXE' ? body.amount : null,
          active: body.active,
          reason: body.reason,
        },
      });
    } else if (body.action === 'toggle_scholarship') {
      const existing = snapshot.tables.scholarships?.find(s => s.id === body.id);
      if (!existing) throw new RequestError(404, 'Bourse introuvable.');

      changes.push({
        table: 'scholarships',
        operation: 'update',
        record: {
          id: body.id,
          active: body.active,
          reason: body.reason,
        },
      });
    } else if (body.action === 'create_fee_schedule') {
      if(body.academicYearId!==year.selectedYearId)throw new RequestError(409,'Le tarif doit appartenir à l’année sélectionnée.');
      if(body.doubleDegree && !snapshot.tables.programs?.some(row=>row.id===body.programId && row.double_degree_eligible===true))throw new RequestError(400,'Choisissez une filière éligible à la double diplomation.');
      const duplicate = (snapshot.tables.annual_fee_schedules || []).find(
        f =>
          !f.archived_at &&
          f.academic_year_id === body.academicYearId &&
          f.category === body.category &&
          (f.double_degree===true) === body.doubleDegree &&
          (f.program_id || null) === (body.programId || null) &&
          (f.level_id || null) === (body.levelId || null) &&
          (f.delivery_mode || null) === (body.deliveryMode || null)
      );
      if (duplicate) {
        throw new RequestError(409, 'Un tarif existe déjà pour cette combinaison année, filière et niveau.');
      }

      changes.push({
        table: 'annual_fee_schedules',
        operation: 'insert',
        record: {
          id: crypto.randomUUID(),
          academic_year_id: body.academicYearId,
          category: body.category,
          double_degree: body.doubleDegree,
          program_id: body.programId || null,
          level_id: body.levelId || null,
          delivery_mode: body.deliveryMode || null,
          amount: body.amount,
          reason: body.reason,
        },
      });
    } else if (body.action === 'archive_fee_schedule') {
      const existing = snapshot.tables.annual_fee_schedules?.find(f => f.id === body.id);
      if (!existing) throw new RequestError(404, 'Tarif introuvable.');
      if(existing.academic_year_id!==year.selectedYearId)throw new RequestError(409,'Le tarif doit appartenir à l’année sélectionnée.');
      if (existing.archived_at) throw new RequestError(409, 'Ce tarif est déjà archivé.');

      changes.push({
        table: 'annual_fee_schedules',
        operation: 'update',
        record: {
          id: body.id,
          archived_at: new Date().toISOString(),
          reason: body.reason,
        },
      });
    } else if (body.action === 'award_scholarship') {
      const enrollment=snapshot.tables.enrollments?.find(row=>row.id===body.enrollmentId);
      if(!snapshot.tables.academic_offerings?.some(row=>row.id===enrollment?.offering_id && row.academic_year_id===year.selectedYearId))throw new RequestError(409,'Inscription hors de l’année sélectionnée.');
      const tuition=scholarshipTuitionLines(snapshot,body.enrollmentId);
      const input={...body,lineIds:tuition.tuition.map(row=>row.id)};
      const preview=previewScholarshipApplication(snapshot,input);
      if(preview.version.id!==body.versionId || preview.reduction!==body.reviewedReduction || preview.newTotal!==body.reviewedTotal)throw new RequestError(409,'Le récapitulatif financier a changé. Recalculez avant de confirmer.');
      changes.push(...planScholarshipApplication(snapshot,input,body.installments,auth.context.accountId));
    }

    const tx = await auth.client.rpc('escen_backend_transaction', {
      p_actor_id: auth.context.accountId,
      p_expected_revision: body.revision,
      p_changes: changes,
    });

    if (tx.error) {
      throw new RequestError(409, 'Enregistrement refusé : vérifiez les données et contraintes d’intégrité.');
    }

    return Response.json({ success: true, revision: tx.data }, { status: 201 });
  } catch (error) {
    return errorResponse(error instanceof ScholarshipApplicationError?new RequestError(409,error.message):error);
  }
}
