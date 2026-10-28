import { z } from 'zod';
import type { CrudField } from '@/data/crudCatalog';
import type { PersistentChange, RelationalSnapshot } from '@/types/persistence';

// One subject is one UE in the current ESCEN curriculum.
export const resaoSubjectFields: CrudField[] = [
  { key: 'discipline', label: 'Sigle de discipline REESAO (3 lettres)', type: 'text', required: true },
  { key: 'semester_id', label: 'Semestre du programme', type: 'reference', reference: 'curriculum_semesters', required: true },
  { key: 'credits', label: 'Crédits', type: 'number', min: 0.01, max: 9999.99, step: 0.01, required: true },
  { key: 'coefficient', label: 'Coefficient', type: 'number', min: 0.001, max: 99999.999, step: 0.001, required: true },
];

export const resaoSubjectSchema = z.object({
  discipline: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, 'Le sigle de discipline doit comporter exactement trois lettres.'),
  semester_id: z.uuid(),
  credits: z.number().min(0.01).max(9999.99).multipleOf(0.01),
  coefficient: z.number().min(0.001).max(99999.999).multipleOf(0.001),
}).strict();

export function resaoSubjectContext(snapshot: RelationalSnapshot, semesterId: string) {
  const semester = snapshot.tables.curriculum_semesters?.find(row => row.id === semesterId && !row.archived_at);
  const curriculum = snapshot.tables.curricula?.find(row => row.id === semester?.curriculum_id && !row.archived_at);
  const level = snapshot.tables.levels?.find(row => row.id === curriculum?.level_id && !row.archived_at && row.active !== false);
  const cycle = snapshot.tables.cycles?.find(row => row.id === level?.cycle_id);
  if (!semester || !curriculum || !level) throw new Error('Choisissez un semestre rattaché à un programme, un niveau et un cycle valides.');
  if (curriculum.status !== 'DRAFT') throw new Error('La matière doit être ajoutée à un programme de formation en brouillon.');
  const cycleText = `${cycle?.code || ''} ${cycle?.name || ''} ${level.code || ''} ${level.name || ''}`.toUpperCase();
  const cycleNumber = /\b(L|L1|L2|L3|LICENCE|BACHELOR)\b/.test(cycleText) ? 1 : /\b(M|M1|M2|EM|MASTER)\b/.test(cycleText) ? 2 : /\b(D|DOCTORAT|DOCTORATE)\b/.test(cycleText) ? 3 : 0;
  if (!cycleNumber) throw new Error('Le cycle doit être identifié comme Licence, Master ou Doctorat pour générer le code REESAO.');
  const position = Number(semester.position);
  const rawLevelPos = Number(level.position);
  const levelPosition = cycleNumber === 2 && rawLevelPos > 2 ? 1 : rawLevelPos;
  // Semester positions in the schema belong to a level-specific curriculum.
  if (![1, 2].includes(position) || !Number.isInteger(levelPosition) || levelPosition < 1) throw new Error('La position du semestre doit être 1 ou 2 dans le niveau.');
  const semesterNumber = (levelPosition - 1) * 2 + position;
  if (semesterNumber > (cycleNumber === 2 ? 4 : 6)) throw new Error('Le semestre dépasse les limites du cycle REESAO.');
  return { semester, curriculum, cycleNumber, semesterNumber };
}

export function generateResaoSubjectCode(snapshot: RelationalSnapshot, discipline: string, semesterId: string, yearId: string): string {
  const sigle = discipline.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(sigle)) throw new Error('Le sigle de discipline doit comporter exactement trois lettres.');
  const { semester, cycleNumber, semesterNumber } = resaoSubjectContext(snapshot, semesterId);
  const prefix = `${sigle}${cycleNumber}${semesterNumber}`;
  // Archived codes remain reserved. Never renumber an existing subject.
  const reserved = new Set([
    ...(snapshot.tables.subjects || []).filter(row => !row.academic_year_id || row.academic_year_id === yearId),
    ...(snapshot.tables.teaching_units || []).filter(row => row.semester_id === semester.id),
  ].map(row => String(row.code || '').replace(/\s/g, '').toUpperCase()));
  const orders = [...reserved].filter(code => code.startsWith(prefix) && /^[0-9]{2}$/.test(code.slice(prefix.length))).map(code => Number(code.slice(prefix.length)));
  const next = Math.max(0, ...orders) + 1;
  if (next > 99) throw new Error('Les 99 codes disponibles pour cette discipline et ce semestre sont déjà attribués.');
  return `${prefix}${String(next).padStart(2, '0')}`;
}

export function resaoSubjectChanges(snapshot: RelationalSnapshot, input: unknown, subject: Record<string, unknown>): PersistentChange[] {
  const values = resaoSubjectSchema.parse(input);
  const { semester, curriculum } = resaoSubjectContext(snapshot, values.semester_id);
  const offerings = (snapshot.tables.academic_offerings || []).filter(row => row.curriculum_id === curriculum.id && !row.archived_at);
  if (offerings.length > 0 && !offerings.some(row => row.academic_year_id === subject.academic_year_id)) throw new Error('Ce programme est déjà utilisé dans une autre année. Choisissez un programme propre à l’année consultée.');
  const code = generateResaoSubjectCode(snapshot, values.discipline, values.semester_id, String(subject.academic_year_id));
  if (subject.code && subject.code !== code) throw new Error('Le code proposé a changé. Actualisez les données avant de confirmer.');
  const unitId = crypto.randomUUID();
  return [
    { table: 'subjects', operation: 'insert', record: { ...subject, code } },
    { table: 'teaching_units', operation: 'insert', record: { id: unitId, curriculum_id: curriculum.id, semester_id: semester.id, code, name: subject.name, credits: values.credits, reason: subject.reason } },
    { table: 'curriculum_components', operation: 'insert', record: { id: crypto.randomUUID(), curriculum_id: curriculum.id, unit_id: unitId, subject_id: subject.id, code, credits: values.credits, coefficient: values.coefficient, reason: subject.reason } },
  ];
}
