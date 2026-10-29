import { displayedEmployeeNumber } from '@/utils/staffReference';
import { emptyDataset, DEFAULT_SETTINGS, type Dataset } from '@/types/application';
import type { DatabaseRow, RelationalSnapshot } from '@/types/persistence';
import type { DemoUser } from '@/types/user';
import { ROLES, type RoleName } from '@/types/permissions';
import { netContractAmount, netPaymentTotal } from './financialProjectionService';
import { effectivePayments } from './paymentAllocationService';

const text = (row: DatabaseRow | undefined, key: string) => typeof row?.[key] === 'string' ? row[key] as string : '';
const numeric = (row: DatabaseRow, key: string) => Number(row[key] ?? 0);
const names = (person: DatabaseRow | undefined) => `${text(person, 'firstname')} ${text(person, 'lastname')}`.trim();
const statuses: Record<string, string> = { INSCRIT: 'Inscrit', REINSCRIT: 'Réinscrit', SUSPENDU: 'Suspendu', ABANDON: 'Abandonné', DIPLOME: 'Diplômé' };

/** Projects authenticated, already scoped rows. Never reconstructs missing enrollments or grants. */
export function projectRelationalCampus(snapshot: RelationalSnapshot, now = new Date()) {
  const today = now.toISOString().slice(0, 10);
  const rows = (table: string) => snapshot.tables[table] ?? [];
  const byId = (table: string) => new Map(rows(table).map(row => [row.id, row]));
  const people = byId('people');
  const offerings = byId('academic_offerings');
  const curricula = byId('curricula');
  const levels = byId('levels');
  const programs = byId('programs');
  const years = byId('academic_years');
  const groups = byId('groups');
  const studentMatricules = new Map(rows('students').map(row => [row.id, text(row, 'matricule')]));
  const data: Dataset = { ...emptyDataset(), settings: [{ ...DEFAULT_SETTINGS }] };
  const enrollmentOffering = (enrollment: DatabaseRow) => offerings.get(text(enrollment, 'offering_id'));
  const enrollmentYear = (enrollment: DatabaseRow) => text(enrollmentOffering(enrollment), 'academic_year_id');
  const membership = (enrollmentId: string) => rows('enrollment_groups').filter(row => row.enrollment_id === enrollmentId
    && text(row, 'valid_from') <= today && (!text(row, 'valid_until') || text(row, 'valid_until') > today))
    .sort((a, b) => text(b, 'valid_from').localeCompare(text(a, 'valid_from')))[0];

  const financials = (enrollmentId: string): Dataset['students'][number]['financials'] => {
    const contract = rows('financial_contracts').find(row => row.enrollment_id === enrollmentId);
    const version = contract && rows('contract_versions').find(row => row.contract_id === contract.id && ['APPROVED', 'EN_COURS'].includes(text(row, 'status')));
    const payments = effectivePayments(snapshot).filter(row => row.enrollment_id === enrollmentId);
    const paid = netPaymentTotal(snapshot, new Set([enrollmentId]));
    if (!version) return { available: false, expected: 0, paid, remaining: 0, installments: [] };
    const expected = netContractAmount(snapshot, version.id);
    return { available: true, expected, paid, remaining: expected - paid, installments: rows('installments').filter(row => row.version_id === version.id).sort((a,b) => numeric(a, 'position') - numeric(b, 'position')).map(row => {
      const settled = row.settled_amount == null ? rows('payment_allocations').filter(allocation => allocation.installment_id === row.id && payments.some(payment => payment.id === allocation.payment_id) && !rows('allocation_reversals').some(reversal => reversal.allocation_id === allocation.id)).reduce((sum, allocation) => sum + numeric(allocation, 'amount'), 0) : numeric(row, 'settled_amount');
      return { dueDate: text(row, 'due_on'), amount: numeric(row, 'amount'), settledAmount: settled, status: settled >= numeric(row, 'amount') ? 'Payée' : settled > 0 ? 'Partiellement payée' : text(row, 'due_on') < today ? 'En retard' : 'A venir' };
    }) };
  };

  data.academicYears = rows('academic_years').map(row => ({ id: row.id, label: text(row, 'name'), startDate: text(row, 'starts_on'), endDate: text(row, 'ends_on'), status: text(row, 'status') as Dataset['academicYears'][number]['status'], active: row.status === 'OUVERTE' && !row.archived_at, history: [] }));
  data.programs = rows('programs').map(row => ({ id: row.id, code: text(row, 'code'), name: text(row, 'name'), description: text(row, 'description'), active: row.active === true, history: [] }));
  data.tracks = rows('tracks').map(row => ({ id: row.id, programId: text(row, 'program_id'), code: text(row, 'code'), name: text(row, 'name'), active: row.active === true, history: [] }));
  const cycles = byId('cycles');
  data.levels = rows('levels').flatMap(row => {
    const cycle = text(cycles.get(text(row, 'cycle_id')), 'code');
    return [{ id: row.id, code: text(row, 'code'), name: text(row, 'name'), cycle: cycle === 'LICENCE' || cycle === 'MASTER' ? cycle : '', order: numeric(row, 'position'), active: true } as Dataset['levels'][number]];
  });
  data.groups = rows('groups').map(row => {
    const linkedCurricula = rows('group_offerings').filter(link => link.group_id === row.id)
      .flatMap(link => { const curriculum = curricula.get(text(offerings.get(text(link, 'offering_id')), 'curriculum_id')); return curriculum ? [curriculum] : []; });
    const programIds = [...new Set(linkedCurricula.map(curriculum => text(curriculum, 'program_id')).filter(Boolean))];
    return { id: row.id, name: text(row, 'name'), academicYearId: text(row, 'academic_year_id'), academicYear: text(years.get(text(row, 'academic_year_id')), 'name'), levelId: text(row, 'level_id'), niveau: text(levels.get(text(row, 'level_id')), 'name'), programIds,
      filieres: programIds.map(id => text(programs.get(id), 'name')).filter(Boolean), trackIds: [...new Set(linkedCurricula.map(curriculum => text(curriculum, 'track_id')).filter(Boolean))],
      studentIds: rows('enrollment_groups').filter(link => link.group_id === row.id && text(link, 'valid_from') <= today && (!text(link, 'valid_until') || text(link, 'valid_until') > today))
        .flatMap(link => { const enrollment = rows('enrollments').find(item => item.id === link.enrollment_id); const matricule = enrollment && studentMatricules.get(text(enrollment, 'student_id')); return matricule ? [matricule] : []; }) };
  });
  data.students = rows('students').filter(row => !row.archived_at).flatMap(row => {
    const person = people.get(text(row, 'person_id'));
    if (!person) return [];
    const enrollment = rows('enrollments').filter(item => item.student_id === row.id).sort((a, b) =>
      text(years.get(enrollmentYear(b)), 'starts_on').localeCompare(text(years.get(enrollmentYear(a)), 'starts_on'))
      || text(b, 'enrolled_on').localeCompare(text(a, 'enrolled_on')))[0];
    const offering = enrollment && enrollmentOffering(enrollment);
    const curriculum = offering && curricula.get(text(offering, 'curriculum_id'));
    const group = enrollment && groups.get(text(membership(enrollment.id), 'group_id'));
    return [{ matricule: text(row, 'matricule'), firstname: text(person, 'firstname'), lastname: text(person, 'lastname'), email: text(person, 'email'), phone: text(person, 'phone'), gender: text(person, 'gender'), birthDate: text(person, 'birth_date'), nationality: text(person, 'nationality'), address: text(person, 'address'), city: text(person, 'city'), country: text(person, 'country'),
      filiere: text(programs.get(text(curriculum, 'program_id')), 'name') || 'Filière non renseignée', niveau: text(levels.get(text(offering, 'level_id')), 'name') || 'Niveau non renseigné', groupe: text(group, 'name') || 'Non affecté', groupId: group?.id || '', academicYearId: text(offering, 'academic_year_id'),
      status: enrollment ? statuses[text(enrollment, 'status')] || 'Statut à vérifier' : 'Sans inscription annuelle',
      financials: enrollment ? financials(enrollment.id) : { available: false, expected: 0, paid: 0, remaining: 0, installments: [] }, bourse: { active: false, type: '', percent: 0, amount: 0 }, history: [] }];
  }).sort((a, b) => a.lastname.localeCompare(b.lastname, 'fr') || a.firstname.localeCompare(b.firstname, 'fr'));
  data.enrollments = rows('enrollments').flatMap(row => {
    const matricule = studentMatricules.get(text(row, 'student_id'));
    const offering = enrollmentOffering(row);
    if (!matricule || !offering) return [];
    const curriculum = curricula.get(text(offering, 'curriculum_id'));
    return [{ id: row.id, studentId: matricule, academicYearId: text(offering, 'academic_year_id'), groupId: text(membership(row.id), 'group_id'), level: text(levels.get(text(offering, 'level_id')), 'name'), program: text(programs.get(text(curriculum, 'program_id')), 'name'), status: text(row, 'status') as Dataset['enrollments'][number]['status'], date: text(row, 'enrolled_on'), reason: '', financials: financials(row.id) }];
  });
  const staff = byId('staff');
  data.teachers = rows('teachers').flatMap(row => {
    const employee = staff.get(text(row, 'staff_id')); const person = people.get(text(employee, 'person_id'));
    return person ? [{ id: row.id, employeeNumber: displayedEmployeeNumber(text(employee, 'employee_number')), firstname: text(person, 'firstname'), lastname: text(person, 'lastname'), email: text(person, 'email'), specialty: text(row, 'specialty'), active: row.active === true }] : [];
  });
  data.rooms = rows('rooms').map(row => ({ code: text(row, 'code'), name: text(row, 'name'), building: text(rows('buildings').find(item => item.id === row.building_id), 'name'), capacity: numeric(row, 'capacity'), status: (row.status === 'MAINTENANCE' ? 'En maintenance' : row.status === 'AVAILABLE' ? 'Disponible' : 'Indisponible') as Dataset['rooms'][number]['status'] }));

  const roleRows = byId('roles');
  const roleNames = ROLES as Record<string, RoleName>;
  const users: DemoUser[] = rows('accounts').filter(row => !row.archived_at).flatMap(row => {
    const person = people.get(text(row, 'person_id')); if (!person) return [];
    const grants = rows('role_grants').filter(grant => grant.account_id === row.id
      && Date.parse(text(grant, 'valid_from')) <= now.getTime() && (!text(grant, 'valid_until') || Date.parse(text(grant, 'valid_until')) > now.getTime()));
    const roles = [...new Set(grants.flatMap(grant => { const role = roleRows.get(text(grant, 'role_id')); const name = roleNames[text(role, 'code')]; return name && role?.active === true ? [name] : []; }))];
    const kind = row.account_type === 'student' || rows('students').some(student => student.person_id === row.person_id) ? 'student' : row.account_type === 'staff' || rows('staff').some(employee => employee.person_id === row.person_id) ? 'staff' : 'unclassified';
    return [{ id: row.id, kind: kind as DemoUser['kind'], name: names(person), email: text(person, 'email'), role: roles[0] ?? null, roles, active: row.active === true, history: [] }];
  }).sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  return { data, users, revision: snapshot.revision };
}
