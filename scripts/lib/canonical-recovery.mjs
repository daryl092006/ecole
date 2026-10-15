import { createHash } from 'node:crypto';

export function buildCanonicalRecovery({ sources, index, actorId, sqlHash, existingPrograms = [] }) {
  const tables = {}; const mappings = []; const issues = [];
  const sourceTables = new Map();
  for (const row of sources) {
    if (!sourceTables.has(row.source_table)) sourceTables.set(row.source_table, new Map());
    sourceTables.get(row.source_table).set(row.source_id, row);
  }
  const rows = table => [...(sourceTables.get(table)?.values() || [])];
  const source = (table, id) => sourceTables.get(table)?.get(String(id));
  const sourceIndex = new Map(index.map(row => [`${row.source_table}:${row.source_id}`, row]));
  const sourceId = row => sourceIndex.get(`${row.source_table}:${row.source_id}`)?.id;
  const existing = (table, id, target) => sourceIndex.get(`${table}:${id}`)?.mappings?.find(mapping => mapping.target_table === target)?.target_id;
  const uuid = key => {
    const bytes = createHash('sha256').update(`${sqlHash}:CANONICAL_2025_V1:${key}`).digest().subarray(0, 16);
    bytes[6] = (bytes[6] & 15) | 80; bytes[8] = (bytes[8] & 63) | 128;
    const hex = bytes.toString('hex'); return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
  };
  const add = (table, key, values, evidence) => {
    const id = uuid(`${table}:${key}`); tables[table] ||= [];
    if (!tables[table].some(row => row.id === id)) tables[table].push({ id, ...values });
    if (evidence && !mappings.some(row => row.row_id === sourceId(evidence) && row.target_table === table && row.target_id === id)) {
      if (!sourceId(evidence)) throw new Error('Identifiant de source absent.');
      mappings.push({ row_id: sourceId(evidence), target_table: table, target_id: id });
    }
    return id;
  };
  const issue = (row, code) => issues.push({ row_id: sourceId(row), code, details: { sourceTable: row.source_table, sourceId: row.source_id } });
  const yearSource = rows('annee_scolaires').filter(row => row.payload.nom === '2025-2026');
  if (yearSource.length !== 1) throw new Error('Année 2025-2026 ambiguë.');
  const yearId = existing('annee_scolaires', yearSource[0].source_id, 'academic_years');
  if (!yearId) throw new Error('Correspondance annuelle officielle absente.');
  const sourceYear = yearSource[0].source_id;
  const annual = table => rows(table).filter(row => row.payload.annee_scolaire_id === sourceYear);
  const levels = new Map(); const programs = new Map(); const groups = new Map();
  for (const row of rows('niveaux')) {
    const p = row.payload;
    levels.set(row.source_id, add('levels', row.source_id, { code: p.code, name: p.libelle, position: Number(p.ordre), cycle_id: null, legacy_source_row_id: sourceId(row) }, row));
  }
  for (const row of rows('filieres')) {
    const p = row.payload;
    const current = existingPrograms.find(item => item.code === p.code);
    if (current) {
      if (current.name !== p.nom || !current.active || current.archived_at) throw new Error('Filière existante incompatible avec la source.');
      programs.set(row.source_id, current.id);
      if (!existing('filieres', row.source_id, 'programs')) mappings.push({ row_id: sourceId(row), target_table: 'programs', target_id: current.id });
      continue;
    }
    programs.set(row.source_id, add('programs', row.source_id, { code: p.code, name: p.nom, description: p.description, active: true }, row));
  }
  for (const row of annual('groups')) {
    const p = row.payload;
    if (!levels.has(p.niveau_id)) { issue(row, 'CANONICAL_GROUP_LEVEL_MISSING'); continue; }
    groups.set(row.source_id, add('groups', row.source_id, { academic_year_id: yearId, level_id: levels.get(p.niveau_id), name: p.nom }, row));
  }
  const curricula = new Map(); const offerings = new Map(); const groupOfferings = new Map();
  const offering = (program, level, mode, evidence) => {
    if (program && !programs.has(program) || !levels.has(level)) return null;
    const curriculumKey = `${program}:${level}`;
    if (program && !curricula.has(curriculumKey)) curricula.set(curriculumKey, add('curricula', curriculumKey, { program_id: programs.get(program), level_id: levels.get(level), version: 1, reason: 'Organisation des formations attestées par les rattachements étudiants et groupes de 2025-2026.' }, evidence));
    const key = `${curriculumKey}:${mode || ''}`;
    if (!offerings.has(key)) offerings.set(key, add('academic_offerings', key, { curriculum_id: curricula.get(curriculumKey) || null, legacy_source_row_id: sourceId(evidence), academic_year_id: yearId, level_id: levels.get(level), delivery_mode: mode || null }, evidence));
    return offerings.get(key);
  };
  const linkGroup = (group, offer, evidence) => {
    const key = `${group}:${offer}`;
    if (!groupOfferings.has(key)) groupOfferings.set(key, add('group_offerings', key, { group_id: groups.get(group), offering_id: offer, academic_year_id: yearId, level_id: levels.get(source('groups', group).payload.niveau_id) }, evidence));
  };
  const enrollments = new Map();
  for (const row of annual('etudiant_group')) {
    const p = row.payload; const group = source('groups', p.group_id);
    const studentId = existing('etudiants', p.etudiant_id, 'students');
    if (!studentId || !groups.has(p.group_id) || group.payload.niveau_id !== p.niveau_id || p.filiere_id && !programs.has(p.filiere_id)) { issue(row, 'CANONICAL_ENROLLMENT_RELATION_INVALID'); continue; }
    if (enrollments.has(p.etudiant_id)) throw new Error('Plusieurs inscriptions source pour un étudiant : arbitrage nécessaire.');
    const offer = offering(p.filiere_id, p.niveau_id, p.mode_formation, row);
    linkGroup(p.group_id, offer, row);
    const id = add('enrollments', row.source_id, { student_id: studentId, offering_id: offer, status: 'INSCRIT', enrolled_on: null, created_by: actorId }, row);
    add('enrollment_groups', row.source_id, { enrollment_id: id, offering_id: offer, group_id: groups.get(p.group_id), valid_from: null, changed_by: actorId, reason: 'Rattachement annuel existant conservé ; date de début non renseignée dans la source.', legacy_source_row_id: sourceId(row) }, row);
    add('enrollment_events', row.source_id, { enrollment_id: id, new_status: 'INSCRIT', actor_id: actorId, reason: 'Intégration de l’inscription attestée par le rattachement étudiant–groupe–année existant.' }, row);
    enrollments.set(p.etudiant_id, { id, offer, row });
  }
  for (const row of rows('filiere_group')) {
    const p = row.payload;
    if (!groups.has(p.group_id) || p.filiere_id && !programs.has(p.filiere_id)) continue;
    if ((tables.group_offerings || []).some(link => link.group_id === groups.get(p.group_id) && (tables.academic_offerings || []).some(offer => offer.id === link.offering_id && (tables.curricula || []).some(c => c.id === offer.curriculum_id && c.program_id === programs.get(p.filiere_id))))) continue;
    const offer = offering(p.filiere_id, source('groups', p.group_id).payload.niveau_id, null, row);
    linkGroup(p.group_id, offer, row);
  }
  for (const row of annual('frais_scolarites')) {
    const p = row.payload;
    if (p.filiere_id && !programs.has(p.filiere_id) || p.niveau_id && !levels.has(p.niveau_id)) { issue(row, 'CANONICAL_FEE_PARENT_MISSING'); continue; }
    add('annual_fee_schedules', `tuition:${row.source_id}`, { academic_year_id: yearId, category: 'SCOLARITE', program_id: programs.get(p.filiere_id) || null, level_id: levels.get(p.niveau_id) || null, amount: Number(p.montant), delivery_mode: p.mode_formation || null, reason: 'Montant, niveau et mode de formation du tarif existant.' }, row);
  }
  // A globally active fee is configuration of the explicitly active source year,
  // never an extra charge added to existing student contracts.
  for (const row of rows('frais_inscriptions').filter(row => row.payload.active === '1' && (row.payload.annee_scolaire_id === sourceYear || row.payload.annee_scolaire_id == null && yearSource[0].payload.active === '1'))) {
    const p = row.payload;
    add('annual_fee_schedules', `registration:${row.source_id}`, { academic_year_id: yearId, category: 'INSCRIPTION', program_id: programs.get(p.filiere_id) || null, level_id: levels.get(p.niveau_id) || null, amount: Number(p.montant), delivery_mode: null, reason: 'Tarif global actif de la configuration de l’année explicitement active ; sans ajout aux contrats existants.' }, row);
  }
  const feeSource = annual('frais_etudiants')[0];
  const tuitionType = add('fee_types', 'SCOLARITE', { code: 'SCOLARITE-2025', name: 'Scolarité', category: 'SCOLARITE' }, feeSource);
  const contracts = new Map(); const installmentIds = new Map();
  for (const row of annual('frais_etudiants')) {
    const p = row.payload; const enrollment = enrollments.get(p.etudiant_id);
    if (!enrollment) { issue(row, 'CANONICAL_CONTRACT_ENROLLMENT_MISSING'); continue; }
    const installments = rows('echeances').filter(item => item.payload.frais_etudiant_id === row.source_id);
    const amount = Number(p.montant_apres_bourse);
    if (Number(p.montant_initial) !== amount || installments.reduce((sum, item) => sum + Number(item.payload.montant), 0) !== amount) { issue(row, 'CANONICAL_CONTRACT_AMOUNT_MISMATCH'); continue; }
    const contract = add('financial_contracts', row.source_id, { enrollment_id: enrollment.id, reference: `CON-2025-${row.source_id}` }, row);
    const version = add('contract_versions', row.source_id, { contract_id: contract, version: 1, status: 'DRAFT', reason: 'Montants contractuels et échéances existants, sans frais d’inscription supplémentaires.', legacy_source_row_id: sourceId(row) }, row);
    add('contract_lines', row.source_id, { contract_id: contract, version_id: version, fee_type_id: tuitionType, description: 'Scolarité 2025-2026', amount }, row);
    const ordered = installments.sort((a,b) => Number(a.payload.ordre) - Number(b.payload.ordre) || Number(a.source_id) - Number(b.source_id));
    ordered.forEach((item, i) => {
      const p = item.payload;
      installmentIds.set(item.source_id, add('installments', item.source_id, { version_id: version, position: i + 1, due_on: p.date_limite, amount: Number(p.montant), settled_amount: p.montant_paye == null ? null : Number(p.montant_paye), description: p.libelle }, item));
    });
    contracts.set(row.source_id, { contract, version, enrollment });
  }
  const channels = new Set();
  for (const row of annual('paiements')) {
    const p = row.payload; const enrollment = enrollments.get(p.etudiant_id);
    const installment = source('echeances', p.payable_id);
    const fee = installment && source('frais_etudiants', installment.payload.frais_etudiant_id);
    if (!enrollment || !fee || fee.payload.etudiant_id !== p.etudiant_id || !contracts.has(fee.source_id) || p.annule !== '0') { issue(row, 'CANONICAL_PAYMENT_RELATION_INVALID'); continue; }
    const method = p.mode_paiement === 'especes' ? 'ESPECES' : p.mode_paiement === 'semoa' ? 'MOBILE_MONEY' : null;
    if (!method || !['valide','en_attente'].includes(p.status)) { issue(row, 'CANONICAL_PAYMENT_STATE_UNKNOWN'); continue; }
    const provider = p.mode_paiement === 'especes' ? 'Espèces' : 'SEMOA';
    const reference = p.reference || `PAIEMENT-2025-${row.source_id}`;
    const payment = add('payments', row.source_id, { enrollment_id: enrollment.id, payer_name: null, amount: Number(p.montant), status: p.status === 'valide' ? 'POSTED' : 'PENDING', method, provider, reference, paid_on: p.date_paiement, recorded_by: actorId, withdrawal_fee: Number(p.frais_retrait_mm || 0), comment: p.commentaire || null, legacy_source_row_id: sourceId(row) }, row);
    if (!channels.has(method + provider)) {
      channels.add(method + provider);
      add('annual_payment_channels', method + provider, { academic_year_id: yearId, name: provider, method, reason: 'Moyen de paiement utilisé dans les versements existants.' }, row);
    }
    if (p.status === 'valide' && p.recu) add('receipts', row.source_id, { payment_id: payment, reference: `REC-2025-${p.order || row.source_id}`, snapshot: { amount: Number(p.montant), reference, method, paidOn: p.date_paiement, originalReceipt: p.recu }, issued_by: actorId }, row);
  }
  const subjects = new Map();
  for (const row of rows('matieres')) if (annual('unite_valeurs').some(uv => uv.payload.matiere_id === row.source_id)) subjects.set(row.source_id, add('subjects', row.source_id, { academic_year_id: yearId, code: row.payload.code, name: row.payload.nom, active: true }, row));
  const components = new Map();
  const component = (uv, offerId) => {
    if (!uv || !subjects.has(uv.payload.matiere_id)) return null;
    const offer = tables.academic_offerings.find(item => item.id === offerId);
    const key = `${uv.source_id}:${offer.curriculum_id || offer.level_id}`;
    if (!components.has(key)) components.set(key, add('curriculum_components', key, { subject_id: subjects.get(uv.payload.matiere_id), curriculum_id: offer.curriculum_id, unit_id: null, code: `${source('matieres', uv.payload.matiere_id).payload.code}-${uv.source_id}`, coefficient: uv.payload.coefficient == null ? null : Number(uv.payload.coefficient), credits: null, cm_hours: uv.payload.cm == null ? null : Number(uv.payload.cm), td_hours: uv.payload.td == null ? null : Number(uv.payload.td), tp_hours: uv.payload.tp == null ? null : Number(uv.payload.tp), other_hours: uv.payload.ec == null ? null : Number(uv.payload.ec), total_hours: uv.payload.volume_horaire == null ? null : Number(uv.payload.volume_horaire), legacy_source_row_id: sourceId(uv) }, uv));
    return components.get(key);
  };
  for (const uv of annual('unite_valeurs')) for (const offer of tables.academic_offerings || []) {
    const curriculum = tables.curricula.find(c => c.id === offer.curriculum_id);
    if (curriculum && programs.get(uv.payload.filiere_id) === curriculum.program_id && levels.get(uv.payload.niveau_id) === offer.level_id) component(uv, offer.id);
  }
  const evaluations = new Map();
  for (const row of annual('evaluations')) {
    const p = row.payload; const uv = source('unite_valeurs', p.unite_valeur_id);
    const links = (tables.group_offerings || []).filter(link => link.group_id === groups.get(p.group_id));
    if (!uv || !links.length) { issue(row, 'CANONICAL_EVALUATION_CONTEXT_MISSING'); continue; }
    for (const link of links) {
      const componentId = component(uv, link.offering_id);
      if (!componentId) { issue(row, 'CANONICAL_EVALUATION_SUBJECT_MISSING'); continue; }
      const subject = source('matieres', uv.payload.matiere_id);
      const id = add('evaluations', `${row.source_id}:${link.offering_id}`, { offering_id: link.offering_id, component_id: componentId, name: `${p.type} · ${subject.payload.nom} · ${p.date}`, group_id: groups.get(p.group_id), held_on: p.date, kind: p.type === 'Devoir' ? 'DEVOIR' : 'EXAMEN', session_type: p.session_type === 'rattrapage' ? 'RATTRAPAGE' : 'NORMALE', status: 'BROUILLON', archived_at: p.deleted_at, created_by: actorId, legacy_source_row_id: sourceId(row) }, row);
      evaluations.set(`${row.source_id}:${link.offering_id}`, id);
    }
  }
  const gradeKeys = new Map();
  for (const row of annual('notes')) {
    const p = row.payload; const enrollment = enrollments.get(p.etudiant_id); const original = source('evaluations', p.evaluation_id);
    if (!original || !enrollment) { issue(row, 'CANONICAL_GRADE_PARENT_MISSING'); continue; }
    if (original.payload.group_id !== enrollment.row.payload.group_id || original.payload.unite_valeur_id !== p.unite_valeur_id) { issue(row, 'CANONICAL_GRADE_CONTEXT_MISMATCH'); continue; }
    const evaluation = evaluations.get(`${p.evaluation_id}:${enrollment.offer}`);
    if (!evaluation) { issue(row, 'CANONICAL_GRADE_EVALUATION_MISSING'); continue; }
    const key = `${evaluation}:${enrollment.id}`;
    if (gradeKeys.has(key)) throw new Error('Notes concurrentes pour le même étudiant et la même évaluation : arbitrage nécessaire.');
    gradeKeys.set(key, row);
    const candidate = add('evaluation_candidates', key, { evaluation_id: evaluation, enrollment_id: enrollment.id, offering_id: enrollment.offer, eligibility: 'ELIGIBLE' }, row);
    add('grades', row.source_id, { candidate_id: candidate, value: p.note == null ? null : Number(p.note), entered_by: actorId, last_modified_by: actorId, entered_at: p.created_at, legacy_source_row_id: sourceId(row) }, row);
  }
  return { yearId, tables, mappings, issues, activeVersions: [...contracts.values()].map(row => row.version), counts: Object.fromEntries(Object.entries(tables).map(([table, rows]) => [table, rows.length])) };
}
