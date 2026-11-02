import fs from 'fs';

function normalizeName(str) {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseAmount(val) {
  if (!val) return 0;
  const cleaned = String(val).replace(/\s+/g, '').replace(',', '.').replace(/[^\d.-]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : Math.round(num);
}

const snap = JSON.parse(fs.readFileSync('.tmp/supabase-snapshot.json', 'utf8'));
const tables = snap.tables;

const year2627 = tables.academic_years.find(y => y.code === '2026-2027' || y.name === '2026-2027');
if (!year2627) throw new Error('Academic year 2026-2027 not found');

// Map offerings
const curriculaMap = new Map(tables.curricula.map(c => [c.id, c]));
const programsMap = new Map(tables.programs.map(p => [p.id, p]));
const levelsMap = new Map(tables.levels.map(l => [l.id, l]));

const offerings2627 = tables.academic_offerings.filter(o => o.academic_year_id === year2627.id && !o.archived_at);
const offeringDetailMap = new Map();
for (const o of offerings2627) {
  const curr = curriculaMap.get(o.curriculum_id);
  const prog = programsMap.get(curr?.program_id);
  const lvl = levelsMap.get(o.level_id);
  offeringDetailMap.set(o.id, {
    id: o.id,
    programCode: prog?.code,
    programName: prog?.name,
    levelCode: lvl?.code,
    levelName: lvl?.name,
  });
}

// Map people and all students
const peopleMap = new Map(tables.people.map(p => [p.id, p]));
const allStudents = tables.students.filter(s => !s.archived_at).map(s => {
  const p = peopleMap.get(s.person_id) || {};
  const fullName = `${p.lastname || ''} ${p.firstname || ''}`.trim();
  const fullNameRev = `${p.firstname || ''} ${p.lastname || ''}`.trim();
  return {
    studentId: s.id,
    personId: s.person_id,
    matricule: s.matricule,
    firstname: p.firstname,
    lastname: p.lastname,
    fullName,
    normalized: normalizeName(fullName),
    normalizedRev: normalizeName(fullNameRev),
    m365_email: s.m365_email,
    created_at: s.created_at,
  };
});

// Map 2026-2027 enrollments
const enrollments2627 = tables.enrollments.filter(e => offeringDetailMap.has(e.offering_id));
const enrollmentByStudentId = new Map(enrollments2627.map(e => [e.student_id, e]));

// Map contracts
const contractsByEnrollmentId = new Map(tables.financial_contracts.map(c => [c.enrollment_id, c]));

// Parse CSV
const csvRaw = fs.readFileSync('docs/ECHEANCIER_RECOUVREMENT_2026_2027.csv', 'utf8');
const lines = csvRaw.split(/\r?\n/).filter(l => l.trim().length > 0);
const sheetRows = [];

for (let i = 1; i < lines.length; i++) {
  const cols = lines[i].split(';');
  const matricule = cols[0]?.trim();
  const name = cols[1]?.trim();
  if (!name || name.toLowerCase().startsWith('total')) continue;

  const grade = cols[2]?.trim();
  const niveau = cols[3]?.trim();
  const filiere = cols[4]?.trim();
  const partenariat = cols[6]?.trim();
  const fraisInscription = parseAmount(cols[8]);
  const fraisScolarite = parseAmount(cols[9]);
  const remiseStr = cols[10]?.trim();
  const remisePct = parseAmount(remiseStr);
  const montantRemise = parseAmount(cols[11]);
  const netScolarite = parseAmount(cols[12]);
  const totalGeneral = parseAmount(cols[13]);
  const modalite = cols[14]?.trim();
  const nbEcheances = parseAmount(cols[15]);
  const dateRentree = cols[16]?.trim();
  const inscriptionPayee = parseAmount(cols[17]);

  // Installments payments M1..M15 (cols 18..32 paid, cols 33..47 due)
  const echeancesPayees = [];
  for (let m = 0; m < 15; m++) {
    const paid = parseAmount(cols[18 + m]);
    if (paid > 0) echeancesPayees.push({ m: m + 1, amount: paid });
  }

  sheetRows.push({
    rowNumber: i + 1,
    matricule: matricule && matricule !== '-' ? matricule : null,
    name,
    normalized: normalizeName(name),
    grade,
    niveau,
    filiere,
    partenariat,
    fraisInscription,
    fraisScolarite,
    remiseStr,
    remisePct,
    montantRemise,
    netScolarite,
    totalGeneral,
    modalite,
    nbEcheances,
    dateRentree,
    inscriptionPayee,
    echeancesPayees,
  });
}

console.log(`\n=== ANALYSE CROISÉE DU RECOUVREMENT 2026-2027 ===`);
console.log(`Lignes dans l'échéancier CSV : ${sheetRows.length}`);
console.log(`Étudiants totaux en base : ${allStudents.length}`);
console.log(`Inscriptions 2026-2027 en base : ${enrollments2627.length}`);

// Matching Sheet -> DB
const matched = [];
const unmatchedSheet = [];

for (const s of sheetRows) {
  // 1. Try exact matricule
  let match = null;
  if (s.matricule) {
    match = allStudents.find(db => db.matricule === s.matricule);
  }

  // 2. Try exact normalized name
  if (!match) {
    match = allStudents.find(db => db.normalized === s.normalized || db.normalizedRev === s.normalized);
  }

  // 3. Try fuzzy words
  if (!match) {
    const sWords = s.normalized.split(' ').filter(w => w.length > 2);
    const candidates = allStudents.filter(db => {
      const dbWords = db.normalized.split(' ').filter(w => w.length > 2);
      const common = sWords.filter(w => dbWords.includes(w));
      return common.length >= 2;
    });
    if (candidates.length === 1) {
      match = candidates[0];
    }
  }

  if (match) {
    const enr = enrollmentByStudentId.get(match.studentId);
    const off = enr ? offeringDetailMap.get(enr.offering_id) : null;
    const contract = enr ? contractsByEnrollmentId.get(enr.id) : null;
    matched.push({
      sheet: s,
      dbStudent: match,
      enrollment: enr,
      offering: off,
      contract,
    });
  } else {
    unmatchedSheet.push(s);
  }
}

// Find DB students enrolled in 2026-2027 not matched with sheet
const matchedStudentIds = new Set(matched.map(m => m.dbStudent.studentId));
const enrolledNotInSheet = enrollments2627.filter(e => !matchedStudentIds.has(e.student_id)).map(e => {
  const s = allStudents.find(stud => stud.studentId === e.student_id);
  const off = offeringDetailMap.get(e.offering_id);
  const c = contractsByEnrollmentId.get(e.id);
  return {
    studentId: s?.studentId,
    matricule: s?.matricule,
    fullName: s?.fullName,
    offering: off,
    status: e.status,
    hasContract: !!c,
  };
});

console.log(`\n1. Étudiants de l'échéancier retrouvés en base : ${matched.length} / ${sheetRows.length}`);
console.log(`   Dont inscrits en 2026-2027 : ${matched.filter(m => m.enrollment).length}`);
console.log(`   Dont NON inscrits en 2026-2027 mais existants dans la base : ${matched.filter(m => !m.enrollment).length}`);
console.log(`2. Étudiants de l'échéancier TOTALEMENT ABSENTS de la base : ${unmatchedSheet.length}`);
console.log(`3. Étudiants inscrits en 2026-2027 en base mais ABSENTS de l'échéancier : ${enrolledNotInSheet.length}`);

// Details of unmatched sheet students
console.log(`\n======================================================================`);
console.log(`DÉTAIL : ÉTUDIANTS DE L'ÉCHÉANCIER ABSENTS DE LA BASE (${unmatchedSheet.length})`);
console.log(`======================================================================`);
for (const s of unmatchedSheet) {
  console.log(`- Ligne ${s.rowNumber}: [${s.matricule || 'SANS MATRICULE'}] ${s.name} | ${s.niveau} ${s.filiere} | Scol: ${s.netScolarite.toLocaleString()} FCFA | Mod: ${s.modalite} (${s.nbEcheances} éch.)`);
}

// Details of matched sheet students NOT enrolled in 2026-2027
const matchedNotEnrolled = matched.filter(m => !m.enrollment);
if (matchedNotEnrolled.length > 0) {
  console.log(`\n======================================================================`);
  console.log(`DÉTAIL : ÉTUDIANTS DE L'ÉCHÉANCIER PRÉSENTS EN BASE MAIS PAS INSCRITS EN 2026-2027 (${matchedNotEnrolled.length})`);
  console.log(`======================================================================`);
  for (const m of matchedNotEnrolled) {
    console.log(`- [${m.dbStudent.matricule}] ${m.dbStudent.fullName} (Feuille: "${m.sheet.name}", ${m.sheet.niveau} ${m.sheet.filiere})`);
  }
}

// Details of DB enrolled students NOT in sheet
if (enrolledNotInSheet.length > 0) {
  console.log(`\n======================================================================`);
  console.log(`DÉTAIL : ÉTUDIANTS INSCRITS EN BASE (2026-2027) MAIS ABSENTS DE L'ÉCHÉANCIER (${enrolledNotInSheet.length})`);
  console.log(`======================================================================`);
  for (const e of enrolledNotInSheet) {
    console.log(`- [${e.matricule}] ${e.fullName} | ${e.offering?.levelCode} ${e.offering?.programCode} | Statut: ${e.status} | Contrat: ${e.hasContract ? 'OUI' : 'NON'}`);
  }
}

// Save detailed JSON
fs.writeFileSync('docs/RAPPORT_CROISEMENT_RECOUVREMENT_2026_2027.json', JSON.stringify({
  summary: {
    sheetTotal: sheetRows.length,
    matchedCount: matched.length,
    matchedEnrolled2026Count: matched.filter(m => m.enrollment).length,
    matchedNotEnrolledCount: matchedNotEnrolled.length,
    unmatchedSheetCount: unmatchedSheet.length,
    enrolledNotInSheetCount: enrolledNotInSheet.length,
  },
  unmatchedSheet,
  matchedNotEnrolled,
  enrolledNotInSheet,
}, null, 2));

console.log(`\nRapport complet écrit dans docs/RAPPORT_CROISEMENT_RECOUVREMENT_2026_2027.json`);
