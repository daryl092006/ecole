import fs from 'fs';

const snap = JSON.parse(fs.readFileSync('.tmp/supabase-snapshot.json'));
const tables = snap.tables;

const normalize = (s) =>
  (s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const year2627 = tables.academic_years.find((y) => y.code === '2026-2027');
const curricula = new Map(tables.curricula.map((c) => [c.id, c]));
const programs = new Map(tables.programs.map((p) => [p.id, p]));
const levels = new Map(tables.levels.map((l) => [l.id, l]));

const offerings = tables.academic_offerings.filter((o) => o.academic_year_id === year2627.id);
const offeringMap = new Map();
for (const o of offerings) {
  const c = curricula.get(o.curriculum_id);
  const p = programs.get(c?.program_id);
  const l = levels.get(o.level_id);
  offeringMap.set(o.id, {
    offeringId: o.id,
    archived_at: o.archived_at,
    levelCode: l?.code,
    levelName: l?.name,
    programCode: p?.code,
    programName: p?.name,
  });
}

const people = new Map(tables.people.map((p) => [p.id, p]));
const students = tables.students.map((s) => {
  const p = people.get(s.person_id) || {};
  const enrs = tables.enrollments.filter((e) => e.student_id === s.id);
  const enr2627 = enrs.find((e) => offeringMap.has(e.offering_id));
  const off = enr2627 ? offeringMap.get(enr2627.offering_id) : null;
  const contract = enr2627
    ? tables.financial_contracts.find((c) => c.enrollment_id === enr2627.id)
    : null;
  return {
    studentId: s.id,
    personId: s.person_id,
    matricule: s.matricule,
    firstname: p.firstname,
    lastname: p.lastname,
    fullName: `${p.lastname} ${p.firstname}`.trim(),
    normalized: normalize(`${p.lastname} ${p.firstname}`),
    normalizedRev: normalize(`${p.firstname} ${p.lastname}`),
    enrollment2627: enr2627,
    offering2627: off,
    contract2627: contract,
  };
});

// Read CSV
const csv = fs.readFileSync('docs/ECHEANCIER_RECOUVREMENT_2026_2027.csv', 'utf8');
const lines = csv.split(/\r?\n/).filter((l) => l.trim().length > 0);
const sheet = [];

for (let i = 1; i < lines.length; i++) {
  const cols = lines[i].split(';');
  const mat = cols[0]?.trim();
  const name = cols[1]?.trim();
  if (!name || name.toLowerCase().startsWith('total')) continue;
  sheet.push({
    rowIdx: i + 1,
    matricule: mat && mat !== '-' ? mat : null,
    name,
    normalized: normalize(name),
    grade: cols[2]?.trim(),
    level: cols[3]?.trim(),
    program: cols[4]?.trim(),
    programAbbr: cols[5]?.trim(),
    partnership: cols[6]?.trim(),
    status: cols[7]?.trim(),
    regFee: parseInt(cols[8]?.replace(/\s/g, '') || '0', 10),
    tuitionFee: parseInt(cols[9]?.replace(/\s/g, '') || '0', 10),
    discountPct: cols[10]?.trim(),
    discountAmount: parseInt(cols[11]?.replace(/\s/g, '') || '0', 10),
    netTuition: parseInt(cols[12]?.replace(/\s/g, '') || '0', 10),
    totalWithReg: parseInt(cols[13]?.replace(/\s/g, '') || '0', 10),
    modality: cols[14]?.trim(),
    installmentsCount: parseInt(cols[15]?.trim() || '0', 10),
    paidReg: parseInt(cols[17]?.replace(/\s/g, '') || '0', 10),
  });
}

// Known manual mappings / aliases between sheet names and DB students
const manualAliases = {
  'DJATO Bougonnou Josué': '019-ESC-2025',
  'Franck Carmel Togbe': '050-ESC-2025',
  'ATIKLEME': '048-ESC-2025',
};

const categorized = {
  alreadyEnrolledAndContracted: [],
  alreadyEnrolledMissingContract: [],
  inDbNotEnrolled2026: [],
  completelyNewStudents: [],
};

const matchedStudentIds = new Set();

for (const row of sheet) {
  let dbStudent = null;
  if (row.matricule) {
    dbStudent = students.find((s) => s.matricule === row.matricule);
  }
  if (!dbStudent && manualAliases[row.name]) {
    dbStudent = students.find((s) => s.matricule === manualAliases[row.name]);
  }
  if (!dbStudent) {
    dbStudent = students.find(
      (s) => s.normalized === row.normalized || s.normalizedRev === row.normalized
    );
  }
  if (!dbStudent) {
    const rWords = row.normalized.split(' ').filter((w) => w.length > 2);
    const candidates = students.filter((s) => {
      const sWords = s.normalized.split(' ').filter((w) => w.length > 2);
      const common = rWords.filter((w) => sWords.includes(w));
      return common.length >= 2;
    });
    if (candidates.length === 1) {
      dbStudent = candidates[0];
    }
  }

  if (dbStudent) {
    matchedStudentIds.add(dbStudent.studentId);
    if (dbStudent.enrollment2627) {
      if (dbStudent.contract2627) {
        categorized.alreadyEnrolledAndContracted.push({ sheet: row, db: dbStudent });
      } else {
        categorized.alreadyEnrolledMissingContract.push({ sheet: row, db: dbStudent });
      }
    } else {
      categorized.inDbNotEnrolled2026.push({ sheet: row, db: dbStudent });
    }
  } else {
    categorized.completelyNewStudents.push(row);
  }
}

// DB students enrolled in 2026-2027 not matched
const dbEnrolledNotOnSheet = students.filter(
  (s) => s.enrollment2627 && !matchedStudentIds.has(s.studentId)
);

console.log('=== BILAN CATÉGORISÉ DE L\'ÉCHÉANCIER ET DE LA BASE ===');
console.log(`1. Déjà inscrits en 2026-2027 avec contrat financier : ${categorized.alreadyEnrolledAndContracted.length}`);
console.log(`2. Inscrits en 2026-2027 MAIS SANS contrat financier : ${categorized.alreadyEnrolledMissingContract.length}`);
console.log(`3. Présents en base mais NON inscrits en 2026-2027 : ${categorized.inDbNotEnrolled2026.length}`);
console.log(`4. ÉTUDIANTS COMPLÈTEMENT NOUVEAUX (à insérer en base) : ${categorized.completelyNewStudents.length}`);
console.log(`5. Inscrits en base 2026-2027 NON PRÉSENTS sur l'échéancier : ${dbEnrolledNotOnSheet.length}`);

console.log('\n--- 2. Inscrits 2026-2027 sans contrat financier ---');
for (const item of categorized.alreadyEnrolledMissingContract) {
  console.log(`[${item.db.matricule}] ${item.db.fullName} | ${item.sheet.level} ${item.sheet.program} | Scolarité: ${item.sheet.netTuition} FCFA`);
}

console.log('\n--- 4. Étudiants complètement nouveaux à insérer (30) ---');
categorized.completelyNewStudents.forEach((s, idx) => {
  console.log(`${idx + 1}. [Ligne ${s.rowIdx}] ${s.name} | ${s.level} ${s.program} (${s.programAbbr}) | Frais: Inscr ${s.regFee}, Scol ${s.netTuition} FCFA | Mod: ${s.modality} (${s.installmentsCount} éch.)`);
});

console.log('\n--- 5. Inscrits en base 2026-2027 non présents sur l\'échéancier ---');
for (const s of dbEnrolledNotOnSheet) {
  console.log(`[${s.matricule}] ${s.fullName} | ${s.offering2627?.levelCode} ${s.offering2627?.programCode} | Statut: ${s.enrollment2627.status} | Contrat: ${s.contract2627 ? 'OUI' : 'NON'}`);
}

