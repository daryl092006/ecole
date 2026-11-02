import fs from 'fs';

// Known applications matched from escen.online_applications
const applicationDataMap = {
  'GNELE Evynel Olanique': {
    ref: 'LEGACY-2026-2027-197',
    email: 'Olola3260@gmail.com',
    phone: '+22891861732',
    birthDate: '2000-05-03',
    gender: 'Féminin',
    nationality: 'Béninoise',
  },
  'AMUZU Koffi Komi Abel': {
    ref: 'LEGACY-2026-2027-177',
    email: 'abelamuzu@gmail.com',
    phone: '+22892874894',
    birthDate: '1997-08-07',
    gender: 'Masculin',
    nationality: 'Togolaise',
  },
  'MAMA Issa': {
    ref: 'LEGACY-2026-2027-178',
    email: 'mamaissa594@gmail.com',
    phone: '+22896517304',
    birthDate: '1992-05-17',
    gender: 'Masculin',
    nationality: 'Togolaise',
  },
  'SAMANI Djibril': {
    ref: 'LEGACY-2026-2027-176',
    email: 'djibrilsamani3@gmail.com',
    phone: '+22893518406',
    birthDate: '1996-05-29',
    gender: 'Masculin',
    nationality: 'Togolaise',
  },
  'LOKOSSOU Cedric Franzt': {
    ref: 'LEGACY-2026-2027-148',
    email: 'cedriclokossou1397@gmail.com',
    phone: '+2290153840441',
    birthDate: '2007-09-13',
    gender: 'Masculin',
    nationality: 'Béninoise',
  },
  'SADJI Yao Wisdom': {
    ref: 'LEGACY-2026-2027-183',
    email: 'wisdomsadji@gmail.com',
    phone: '+22892307889',
    birthDate: '1999-04-29',
    gender: 'Masculin',
    nationality: 'Togolaise',
  },
  'OUSMAN Ahmat Mahamat': {
    ref: 'LEGACY-2026-2027-165',
    email: 'ousmanaht50@gmail.com',
    phone: '+23590809797',
    birthDate: '2002-01-01',
    gender: 'Masculin',
    nationality: 'Tchadienne',
  },
  'AKODA Pascal': {
    ref: 'LEGACY-2026-2027-201',
    email: 'pasciakoda@gmail.com',
    phone: '+22893102660',
    birthDate: '1995-04-15',
    gender: 'Masculin',
    nationality: 'Togolaise',
  },
  'TCHABANA Malia': {
    ref: 'LEGACY-2026-2027-126',
    email: 'tchabanamalia@gmail.com',
    phone: '+22870460208',
    birthDate: '2002-04-29',
    gender: 'Féminin',
    nationality: 'Togolaise',
  },
  'MARCOS Nafissath': {
    ref: 'LEGACY-2026-2027-175',
    email: 'nafissathmarcos21@gmail.com',
    phone: '+2290197326629',
    birthDate: '2005-01-21',
    gender: 'Féminin',
    nationality: 'Béninoise',
  },
};

// 28 missing students list
const missingNames = [
  'AKOR Abla Élisée',
  'BANNA Achraf',
  'GBADOE Komi Prince Antoine',
  'AGUIDI Abla Dzifa',
  'BODJONA Koboyo Magnim',
  'BOURAIMA Rafik',
  'EGAN Akouvi Alice',
  'GNELE Evynel Olanique',
  'AKAKPO Harmony Daniella Modoukpe',
  'AMONY Mensah Léopold Junior',
  'AMUZU Koffi Komi Abel',
  'MAMA Issa',
  'OLOHUNTO Amed Oba Sanjo',
  'SAMANI Djibril',
  'LOKOSSOU Cedric Franzt',
  'DATEY Dah Mokpokpo',
  'SADJI Yao Wisdom',
  'GOUMBANE Bouamey',
  'KOUADIO Kouadio Joel',
  'LOKO Cristilla Flavia',
  'OUSMAN Ahmat Mahamat',
  'AKODA Pascal',
  'TCHABANA Malia',
  'ANNOUR Mahamat Saleh Kaya',
  'CHIDAS Vanessa Grâce Emilienne',
  'SAMKLU Enyonam',
  'MARCOS Nafissath',
  'KIALA MFUAMBI Beni',
];

// 8 students already enrolled but missing financial contract in DB
const existingMissingContracts = [
  { matricule: '158-ESC-2026', key: 'AHYEE' },
  { matricule: '153-ESC-2026', key: 'EKLO' },
  { matricule: '163-ESC-2026', key: 'TELOU' },
  { matricule: '160-ESC-2026', key: 'AHOSSI' },
  { matricule: '152-ESC-2026', key: 'BOLOUVI' },
  { matricule: '162-ESC-2026', key: 'FOLLY-NOTSRON' },
  { matricule: '161-ESC-2026', key: 'TESSI' },
  { matricule: '159-ESC-2026', key: 'ACAKPO' },
];

const csv = fs.readFileSync('docs/ECHEANCIER_RECOUVREMENT_2026_2027.csv', 'utf8');
const lines = csv.split(/\r?\n/).filter((l) => l.trim().length > 0);

function parseAmount(val) {
  if (!val) return 0;
  const cleaned = String(val).replace(/\s+/g, '').replace(',', '.').replace(/[^\d.-]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : Math.round(num);
}

function normalizeNameParts(fullName) {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return { lastname: parts[0], firstname: parts[0] };
  if (parts.length === 2) return { lastname: parts[0], firstname: parts[1] };
  if (parts[0] === parts[0].toUpperCase() && parts[1] === parts[1].toUpperCase()) {
    return { lastname: `${parts[0]} ${parts[1]}`, firstname: parts.slice(2).join(' ') };
  }
  return { lastname: parts[0], firstname: parts.slice(1).join(' ') };
}

function escapeSql(str) {
  if (!str) return 'NULL';
  return `'${String(str).replace(/'/g, "''")}'`;
}

const monthDates = [
  '2026-08-15', '2026-09-15', '2026-10-15', '2026-11-15', '2026-12-15',
  '2027-01-15', '2027-02-15', '2027-03-15', '2027-04-15', '2027-05-15',
  '2027-06-15', '2027-07-15', '2027-08-15', '2027-09-15', '2027-10-15',
];

const studentsToInsert = [];
const studentsToContract = [];

for (let i = 1; i < lines.length; i++) {
  const cols = lines[i].split(';');
  const name = cols[1]?.trim();
  const mat = cols[0]?.trim();

  const isMissing = missingNames.includes(name);
  const matchedExisting = existingMissingContracts.find(
    (em) => em.matricule === mat || (name && name.toUpperCase().includes(em.key))
  );

  if (!isMissing && !matchedExisting) continue;

  const lvl = cols[3]?.trim();
  const levelCode = lvl === 'Master Pro' ? 'EM' : lvl;
  const progAbbr = cols[5]?.trim();
  let progCode = progAbbr === 'IA' ? 'IA-GL' : progAbbr === 'MD' ? 'MDE' : progAbbr;
  if (['M1', 'M2'].includes(levelCode) && progAbbr === 'MPN') {
    progCode = 'MP-TD';
  }

  const { lastname, firstname } = normalizeNameParts(name);
  const regFee = parseAmount(cols[8]);
  const grossTuition = parseAmount(cols[9]);
  const discountStr = cols[10]?.trim();
  const netTuition = parseAmount(cols[12]);
  const totalWithReg = parseAmount(cols[13]);
  const modality = cols[14]?.trim();
  const installmentsCount = parseAmount(cols[15]);

  const installments = [];
  let pos = 1;
  for (let m = 0; m < 15; m++) {
    const due = parseAmount(cols[17 + m]);
    if (due > 0) {
      installments.push({
        position: pos++,
        month: `M${m + 1}`,
        due_on: monthDates[m],
        amount: due,
        description: `Tranche ${pos - 1} (${modality})`,
      });
    }
  }

  if (installments.length === 0 && netTuition > 0) {
    if (modality === 'Annuel') {
      installments.push({ position: 1, month: 'M3', due_on: '2026-10-15', amount: netTuition, description: 'Tranche 1 (Annuel)' });
    } else {
      const count = installmentsCount || 4;
      const part = Math.round(netTuition / count);
      for (let k = 0; k < count; k++) {
        installments.push({
          position: k + 1,
          month: `M${3 + k * 2}`,
          due_on: monthDates[2 + k * 2] || '2027-04-15',
          amount: k === count - 1 ? netTuition - part * (count - 1) : part,
          description: `Tranche ${k + 1} (${modality})`,
        });
      }
    }
  }

  const appData = applicationDataMap[name] || null;

  const item = {
    rowIdx: i + 1,
    matricule: matchedExisting ? matchedExisting.matricule : (mat && mat !== '-' ? mat : null),
    name,
    lastname,
    firstname,
    levelCode,
    progCode,
    regFee,
    grossTuition,
    discountStr,
    netTuition,
    totalWithReg,
    modality,
    installmentsCount,
    installments,
    appData,
  };

  if (isMissing) {
    studentsToInsert.push(item);
  } else {
    studentsToContract.push(item);
  }
}

console.log(`Prepared ${studentsToInsert.length} students to insert.`);
console.log(`Prepared ${studentsToContract.length} existing students to create contracts for.`);

let sql = `-- Migration : Insertion des 28 étudiants de l'échéancier de recouvrement 2026-2027 et régularisation des contrats
-- Référence source : docs/ECHEANCIER_RECOUVREMENT_2026_2027.csv
-- Conforme à la règle du 28/10/2026 : matricules automatiques séquentiels NNN-ESC-2026

do $$
declare
  v_year_id uuid;
  v_admin_id uuid;
  v_next_num int;
  v_matricule text;
  v_person_id uuid;
  v_student_id uuid;
  v_offering_id uuid;
  v_enrollment_id uuid;
  v_contract_id uuid;
  v_version_id uuid;
  v_fee_inscription_id uuid;
  v_fee_scolarite_id uuid;
begin
  -- Autoriser les modifications administratives sur online_applications
  perform set_config('escen.application_command', '1', true);

  -- 1. Récupérer l'année 2026-2027
  select id into v_year_id from escen.academic_years where code = '2026-2027' limit 1;
  if v_year_id is null then
    select id into v_year_id from escen.academic_years where name = '2026-2027' limit 1;
  end if;

  -- Si l'année 2026-2027 n'existe pas encore (recette locale ou base vierge), ne rien faire
  if v_year_id is null then
    return;
  end if;

  -- 2. Récupérer un administrateur pour l'audit et l'approbation
  select a.id into v_admin_id
  from escen.accounts a
  join escen.people p on p.id = a.person_id
  where p.email = 'g.nobel@escen.university' limit 1;

  if v_admin_id is null then
    select id into v_admin_id from escen.accounts limit 1;
  end if;

  -- 3. Récupérer les types de frais
  select id into v_fee_inscription_id from escen.fee_types where code = 'ANNUAL-INSCRIPTION' limit 1;
  select id into v_fee_scolarite_id from escen.fee_types where code = 'ANNUAL-SCOLARITE' limit 1;

  -- 4. Obtenir le dernier numéro de matricule
  select coalesce(max(nullif(regexp_replace(matricule, '^([0-9]+)-ESC-.*$', '\\1'), matricule)::int), 163)
    into v_next_num from escen.students where matricule like '%-ESC-%';

  ----------------------------------------------------------------------
  -- PARTIE A : INSERTION DES 28 ÉTUDIANTS MANQUANTS
  ----------------------------------------------------------------------
`;

for (const s of studentsToInsert) {
  const personalEmail = s.appData?.email || null;
  const phone = s.appData?.phone || null;
  const birthDate = s.appData?.birthDate || null;
  const gender = s.appData?.gender || null;
  const nationality = s.appData?.nationality || null;

  sql += `  -- [Ligne ${s.rowIdx}] ${s.name} (${s.levelCode} ${s.progCode})\n`;
  sql += `  v_next_num := v_next_num + 1;\n`;
  sql += `  v_matricule := lpad(v_next_num::text, 3, '0') || '-ESC-2026';\n\n`;

  sql += `  -- Récupérer l'offre active pour ${s.levelCode} ${s.progCode}\n`;
  sql += `  select o.id into v_offering_id\n`;
  sql += `  from escen.academic_offerings o\n`;
  sql += `  join escen.levels l on l.id = o.level_id\n`;
  sql += `  join escen.curricula c on c.id = o.curriculum_id\n`;
  sql += `  join escen.programs p on p.id = c.program_id\n`;
  sql += `  where o.academic_year_id = v_year_id\n`;
  sql += `    and l.code = '${s.levelCode}'\n`;
  sql += `    and p.code = '${s.progCode}'\n`;
  sql += `    and o.archived_at is null\n`;
  sql += `  limit 1;\n\n`;

  sql += `  -- Création personne\n`;
  sql += `  insert into escen.people(firstname, lastname, email, phone, gender, birth_date, nationality)\n`;
  sql += `  values (${escapeSql(s.firstname)}, ${escapeSql(s.lastname)}, ${personalEmail ? escapeSql(personalEmail) : 'NULL'}, ${escapeSql(phone)}, ${escapeSql(gender)}, ${birthDate ? `'${birthDate}'` : 'NULL'}, ${escapeSql(nationality)})\n`;
  sql += `  returning id into v_person_id;\n\n`;

  sql += `  -- Création étudiant\n`;
  sql += `  insert into escen.students(person_id, matricule, reason)\n`;
  sql += `  values (v_person_id, v_matricule, 'Intégration échéancier de recouvrement 2026-2027')\n`;
  sql += `  returning id into v_student_id;\n\n`;

  if (!personalEmail) {
    sql += `  -- Aligner l'email de la personne sur l'email étudiant officiel généré\n`;
    sql += `  update escen.people set email = (select m365_email from escen.students where id = v_student_id) where id = v_person_id;\n\n`;
  }

  if (s.appData?.ref) {
    sql += `  -- Lier la candidature en ligne si existante\n`;
    sql += `  update escen.online_applications set student_id = v_student_id, workflow_stage = 'ADMIS_OFFICIEL' where reference = '${s.appData.ref}';\n\n`;
  }

  sql += `  -- Inscription académique 2026-2027\n`;
  sql += `  if v_offering_id is not null then\n`;
  sql += `    insert into escen.enrollments(student_id, offering_id, status, enrolled_on, created_by)\n`;
  sql += `    values (v_student_id, v_offering_id, 'INSCRIT', current_date, v_admin_id)\n`;
  sql += `    returning id into v_enrollment_id;\n\n`;

  sql += `    -- Contrat financier\n`;
  sql += `    insert into escen.financial_contracts(enrollment_id, reference, currency)\n`;
  sql += `    values (v_enrollment_id, 'CON-2026-' || lpad(v_next_num::text, 3, '0'), 'XOF')\n`;
  sql += `    returning id into v_contract_id;\n\n`;

  sql += `    -- Version du contrat\n`;
  sql += `    insert into escen.contract_versions(contract_id, version, status, reason, approved_by, approved_at)\n`;
  sql += `    values (v_contract_id, 1, 'DRAFT', 'Échéancier de scolarité 2026-2027 (${s.modality})', v_admin_id, null)\n`;
  sql += `    returning id into v_version_id;\n\n`;

  if (s.regFee > 0) {
    sql += `    -- Ligne frais inscription\n`;
    sql += `    insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)\n`;
    sql += `    values (v_contract_id, v_version_id, v_fee_inscription_id, ${s.regFee}, 'Frais d''inscription 2026-2027');\n`;
  }

  if (s.netTuition > 0) {
    sql += `    -- Ligne frais scolarité\n`;
    sql += `    insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)\n`;
    sql += `    values (v_contract_id, v_version_id, v_fee_scolarite_id, ${s.netTuition}, 'Scolarité 2026-2027 (${s.discountStr ? 'Remise ' + s.discountStr : 'Tarif standard'})');\n`;
  }

  for (const inst of s.installments) {
    sql += `    -- Échéance ${inst.description}\n`;
    sql += `    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)\n`;
    sql += `    values (v_version_id, ${inst.position}, ${escapeSql(inst.description)}, ${inst.amount}, '${inst.due_on}', 0);\n`;
  }
  sql += `  end if;\n\n`;
}

sql += `  ----------------------------------------------------------------------\n`;
sql += `  -- PARTIE B : CRÉATION DES CONTRATS POUR LES 8 ÉTUDIANTS DÉJÀ INSCRITS\n`;
sql += `  ----------------------------------------------------------------------\n`;

for (const s of studentsToContract) {
  sql += `  -- [Matricule ${s.matricule}] ${s.name}\n`;
  sql += `  select e.id into v_enrollment_id\n`;
  sql += `  from escen.students st\n`;
  sql += `  join escen.enrollments e on e.student_id = st.id\n`;
  sql += `  join escen.academic_offerings o on o.id = e.offering_id\n`;
  sql += `  where st.matricule = '${s.matricule}' and o.academic_year_id = v_year_id\n`;
  sql += `  limit 1;\n\n`;

  sql += `  if v_enrollment_id is not null and not exists (select 1 from escen.financial_contracts where enrollment_id = v_enrollment_id) then\n`;
  sql += `    insert into escen.financial_contracts(enrollment_id, reference, currency)\n`;
  sql += `    values (v_enrollment_id, 'CON-2026-' || split_part('${s.matricule}', '-', 1), 'XOF')\n`;
  sql += `    returning id into v_contract_id;\n\n`;

  sql += `    insert into escen.contract_versions(contract_id, version, status, reason, approved_by, approved_at)\n`;
  sql += `    values (v_contract_id, 1, 'DRAFT', 'Échéancier de scolarité 2026-2027 (${s.modality})', v_admin_id, null)\n`;
  sql += `    returning id into v_version_id;\n\n`;

  if (s.regFee > 0) {
    sql += `    insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)\n`;
    sql += `    values (v_contract_id, v_version_id, v_fee_inscription_id, ${s.regFee}, 'Frais d''inscription 2026-2027');\n`;
  }

  if (s.netTuition > 0) {
    sql += `    insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)\n`;
    sql += `    values (v_contract_id, v_version_id, v_fee_scolarite_id, ${s.netTuition}, 'Scolarité 2026-2027 (${s.discountStr ? 'Remise ' + s.discountStr : 'Tarif standard'})');\n`;
  }

  for (const inst of s.installments) {
    sql += `    insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)\n`;
    sql += `    values (v_version_id, ${inst.position}, ${escapeSql(inst.description)}, ${inst.amount}, '${inst.due_on}', 0);\n`;
  }
  sql += `  end if;\n\n`;
}

sql += `end $$;\n`;

fs.writeFileSync('supabase/migrations/202611020076_insert_missing_recovery_students_2026_2027.sql', sql);
console.log('Migration successfully rewritten to supabase/migrations/202611020076_insert_missing_recovery_students_2026_2027.sql');
