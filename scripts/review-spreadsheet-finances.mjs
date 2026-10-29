import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const normalize = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/gi, '').toLowerCase();

export function parseAmount(value) {
  const text = String(value ?? '').trim().replace(/\s/g, '').replace(',', '.');
  if (!text || text === '-') return 0;
  const amount = Number(text);
  if (!Number.isSafeInteger(amount) || amount < 0) throw new Error(`Montant invalide : ${value}`);
  return amount;
}

export function reviewSpreadsheet(raw, snapshot, yearCode = '2026-2027') {
  const lines = raw.split(/\r?\n/);
  const start = lines.findIndex(line => line.includes('Matricule') && line.includes('Nom & Prénoms'));
  if (start < 0) throw new Error('En-tête du tableau introuvable.');
  const headers = lines[start].split('\t').map(value => value.trim());
  const required = ['Matricule', 'Nom & Prénoms', 'Niveau', 'Filières Abrév.', "Frais d'inscription", 'Total à payer sans frais d\'inscription', 'Total à payer avec frais d\'inscription', 'Modalité de paiement', 'Nb échéances', 'Inscription payée', ...Array.from({ length: 15 }, (_, i) => `Payé M${i + 1}`)];
  for (const header of required) if (!headers.includes(header)) throw new Error(`Colonne manquante : ${header}`);
  const tables = snapshot.tables;
  const year = tables.academic_years.find(item => item.code === yearCode || item.name === yearCode);
  if (!year) throw new Error(`Année introuvable : ${yearCode}`);
  const offerings = tables.academic_offerings.filter(item => item.academic_year_id === year.id && !item.archived_at);
  const rows = [];
  for (let index = start + 1; index < lines.length; index++) {
    const cells = lines[index].split('\t');
    const get = header => (cells[headers.indexOf(header)] || '').trim();
    const name = get('Nom & Prénoms');
    if (!name || !get('Niveau') || /total/i.test(name)) continue;
    const issues = [];
    const amount = header => { try { return parseAmount(get(header)); } catch (error) { issues.push(`${header} : ${error.message}`); return null; } };
    const level = get('Niveau').toUpperCase() === 'MASTER PRO' ? 'EM' : get('Niveau').toUpperCase();
    const abbreviation = get('Filières Abrév.').toUpperCase();
    const program = abbreviation === 'IA' ? 'IA-GL' : abbreviation === 'MD' ? 'MDE' : abbreviation === 'MPN' && ['M1', 'M2'].includes(level) ? 'MP-TD' : abbreviation;
    const matches = offerings.filter(offering => {
      const curriculum = tables.curricula.find(item => item.id === offering.curriculum_id);
      return tables.levels.find(item => item.id === offering.level_id)?.code === level && tables.programs.find(item => item.id === curriculum?.program_id)?.code === program;
    });
    if (matches.length !== 1) issues.push(matches.length ? 'Plusieurs formations possibles : choisir le mode et le groupe.' : `Formation absente : ${level} ${program}`);
    const candidates = tables.students.filter(student => {
      if (student.archived_at) return false;
      const person = tables.people.find(item => item.id === student.person_id);
      return (get('Matricule') && student.matricule === get('Matricule')) || (person && [normalize(`${person.lastname} ${person.firstname}`), normalize(`${person.firstname} ${person.lastname}`)].includes(normalize(name)));
    }).map(student => {
      const person = tables.people.find(item => item.id === student.person_id);
      return { studentId: student.id, matricule: student.matricule, firstname: person?.firstname, lastname: person?.lastname };
    });
    if (candidates.length !== 1) issues.push(candidates.length ? 'Identité ambiguë : sélectionner le dossier.' : 'Identité à vérifier avant création ou rapprochement.');
    const payments = [];
    const registrationPaid = amount('Inscription payée');
    if (registrationPaid > 0) payments.push({ kind: 'INSCRIPTION', amount: registrationPaid, month: null, paidOn: null, method: null, reference: null });
    for (let m = 0; m < 15; m++) {
      const paid = amount(`Payé M${m + 1}`);
      if (paid > 0) {
        const date = new Date(Date.UTC(Number(yearCode.slice(0, 4)), 7 + m, 1));
        payments.push({ kind: 'SCOLARITE', amount: paid, month: date.toISOString().slice(0, 7), paidOn: null, method: null, reference: null });
      }
    }
    if (payments.length) issues.push('Moyens et références des paiements à vérifier ; les dates inconnues restent absentes, conformément à la consigne de reprise.');
    const student = candidates.length === 1 ? candidates[0] : null;
    const enrollments = student ? tables.enrollments.filter(item => item.student_id === student.studentId && tables.academic_offerings.some(offering => offering.id === item.offering_id && offering.academic_year_id === year.id)) : [];
    const existingPayments = (tables.payments || []).filter(item => enrollments.some(enrollment => enrollment.id === item.enrollment_id)).map(item => ({ id: item.id, reference: item.reference, amount: item.amount, paidOn: item.paid_on, status: item.status, cancelled: (tables.payment_reversals || []).some(reversal => reversal.payment_id === item.id) }));
    if (existingPayments.length) issues.push('Paiements existants : rapprochement obligatoire avant tout nouvel encaissement.');
    const registrationFee = amount("Frais d'inscription");
    const tuition = amount("Total à payer sans frais d'inscription");
    const total = amount("Total à payer avec frais d'inscription");
    if (registrationFee !== null && tuition !== null && total !== null && registrationFee + tuition !== total) issues.push('Le total du contrat ne correspond pas à inscription + scolarité nette.');
    const installments = [];
    for (let m = 0; m < 15; m++) {
      const header = `A payer M${m + 1}`;
      if (!headers.includes(header)) continue;
      const due = amount(header);
      if (due > 0) installments.push({ month: new Date(Date.UTC(Number(yearCode.slice(0, 4)), 7 + m, 1)).toISOString().slice(0, 7), amount: due, dueOn: null });
    }
    if (installments.length && installments.reduce((sum, installment) => sum + installment.amount, 0) !== tuition) issues.push('Échéancier mensuel différent de la scolarité nette : vérifier les arrondis et avances.');
    rows.push({ sourceRow: index + 1, sourceName: name, sourceMatricule: get('Matricule'), level, program, offeringIds: matches.map(item => item.id), identityCandidates: candidates, correctedIdentity: null, modality: get('Modalité de paiement'), installmentCount: amount('Nb échéances'), registrationFee, tuition, total, installments, payments, existingPayments, issues });
  }
  return { sourceRevision: snapshot.revision, academicYear: yearCode, remoteWrites: 0, rows, summary: { rows: rows.length, rowsWithPayments: rows.filter(row => row.payments.length).length, recordedInSpreadsheet: rows.flatMap(row => row.payments).reduce((sum, payment) => sum + payment.amount, 0), missingOrAmbiguousOfferings: rows.filter(row => row.offeringIds.length !== 1).length } };
}

async function main() {
  const [source, output] = process.argv.slice(2);
  if (!source || !output) throw new Error('Usage : node scripts/review-spreadsheet-finances.mjs source.tsv rapport.json');
  const { default: nextEnv } = await import('@next/env');
  nextEnv.loadEnvConfig(process.cwd());
  const { createClient } = await import('@supabase/supabase-js');
  const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const { data, error } = await client.rpc('escen_backend_snapshot');
  if (error) throw error;
  const report = reviewSpreadsheet(fs.readFileSync(source, 'utf8'), data);
  fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`, { flag: 'wx' });
  console.log(JSON.stringify(report.summary));
  console.log('Rapport local créé. Aucune écriture distante. Aucune ligne écartée comme doublon sans vérification.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
