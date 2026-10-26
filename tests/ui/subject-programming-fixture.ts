import { scheduleFixture } from './schedule-management-fixture';
import { loadSecurityApi, securityContext, securityIds as id, uuid } from './security-fixture';
import type { PersistentChange, PersistentContext, DatabaseRow } from '../../src/types/persistence';
import type { SubjectInput } from '../../src/types/subject';

export function subjectProgrammingFixture(context: PersistentContext = securityContext()) {
  const snapshot = scheduleFixture(context).snapshot;
  const tables = snapshot.tables;
  tables.grades = []; tables.exam_attempts = []; tables.exam_papers = [];
  const start = new Date(Date.now() + 86400000); start.setUTCMinutes(0, 0, 0);
  const end = new Date(start.getTime() + 7200000);
  Object.assign(tables.evaluations[0], { name: 'Examen de finance programmé', kind: 'EXAMEN' });
  Object.assign(tables.sessions[0], { mode: 'EN_LIGNE', starts_at: start.toISOString(), ends_at: end.toISOString() });
  tables.exam_deliveries = [{ id: uuid(980), evaluation_id: id.evaluation(0), session_id: tables.sessions[0].id,
    access_opens_at: start.toISOString(), access_closes_at: end.toISOString(), duration_minutes: 120 }];
  const transactions: PersistentChange[][] = [];
  let qcmJustification = false;
  const client = { async rpc(name: string, args: Record<string, unknown> = {}) {
    if (name === 'escen_subject_features') return { data: { qcmJustification }, error: null };
    if (name === 'escen_backend_snapshot') return { data: snapshot, error: null };
    if (name === 'escen_academic_year_context') return { data: { currentYearId: id.year }, error: null };
    if (name !== 'escen_subject_transaction') throw new Error(`Unexpected RPC: ${name}`);
    const changes = args.p_changes as PersistentChange[];
    transactions.push(changes);
    for (const change of changes) {
      const rows = tables[change.table] ||= [];
      if (change.operation === 'insert') rows.push(change.record as DatabaseRow);
      else Object.assign(rows.find(row => row.id === change.record.id)!, change.record);
    }
    return { data: ++snapshot.revision, error: null };
  } };
  const route = loadSecurityApi('app/api/subjects/route.ts', client, context) as { GET: (request: Request) => Promise<Response>; POST: (request: Request) => Promise<Response> };
  const subject: SubjectInput = { title: 'Examen de finance programmé', instructions: 'Lisez les questions.', durationMinutes: 120,
    purpose: 'EXAMEN', evaluationId: id.evaluation(0), sourceEvaluationRowId: null, authorize: false,
    parts: [{ title: 'Analyse', instructions: '', questions: [{ prompt: 'Expliquez le risque.', kind: 'TEXTE', points: 20, options: [], correction: 'Argumenter les risques.' }] }] };
  const get = (year = id.year) => route.GET(new Request('http://local.test/api/subjects', { headers: { 'x-escen-year': year } }));
  const post = (patch: Partial<SubjectInput> = {}, previousId?: string) => route.POST(new Request('http://local.test/api/subjects', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-escen-year': id.year },
    body: JSON.stringify({ revision: snapshot.revision, reason: 'Composition du sujet programmé', subject: { ...subject, ...patch }, previousId }),
  }));
  return { snapshot, route, subject, transactions, get, post, enableJustification() { qcmJustification = true; } };
}
