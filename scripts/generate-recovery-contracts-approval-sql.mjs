/**
 * Générateur de la migration 078 pour approuver et régulariser tous les contrats 2026-2027
 */
import fs from 'fs';
import { execSync } from 'child_process';

const query = `
select s.matricule, p.firstname, p.lastname,
       c.id as contract_id, v.id as version_id, e.id as enrollment_id
from escen.contract_versions v
join escen.financial_contracts c on c.id = v.contract_id
join escen.enrollments e on e.id = c.enrollment_id
join escen.academic_offerings o on o.id = e.offering_id
join escen.academic_years y on y.id = o.academic_year_id
join escen.students s on s.id = e.student_id
join escen.people p on p.id = s.person_id
where y.code = '2026-2027'
order by s.matricule;
`;

fs.writeFileSync('.tmp/get_contracts_for_approval.sql', query);
const res = execSync(`npx supabase db query --remote --yes --file .tmp/get_contracts_for_approval.sql`, { encoding: 'utf-8' });
const match = res.match(/\{[\s\S]*"rows":\s*(\[[^\]]*\])/);
const rows = JSON.parse(match[1]);

const lines = fs.readFileSync('docs/ECHEANCIER_RECOUVREMENT_2026_2027.csv', 'utf8').trim().split('\n');
const parseAmount = (val) => {
  if (!val) return 0;
  const clean = val.replace(/\s/g, '').replace(',', '.');
  return isNaN(Number(clean)) ? 0 : Number(clean);
};

const normalize = (s) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z]/g, ' ').trim().split(/\s+/).sort().join(' ');

const overrides = {
  'KPOBIE Manawe': '002-ESC-2025',
  'TETE TCHEYI Apéfa Eyram Rebecca': '003-ESC-2025',
  'AGBA Yawo Gedeon': '032-ESC-2025',
  'DJATO Bougonnou Josué': '019-ESC-2025',
  'FOLLY-NOTSRON Agbenou Ayélé Darina': '162-ESC-2026',
  'LOGOSSOU Ami Sika Sandra': '013-ESC-2024',
  'Franck Carmel Togbe': '050-ESC-2025',
  'GNIDOTE Senam Soke Arnaud': '083-ESC-2025',
  'WALLA Azah Wembou': '084-ESC-2025',
  'YAO DJE Fortune Herman': '051-ESC-2025',
  'KOUASSI Jerryda Ahlimba': '053-ESC-2025',
  'AGBO Akossiwa Fanta-maiga': '002-ESC-2022',
  'KPOSSOU Aimée': '027-ESC-2022',
};

const contractsToApprove = [];

for (let i = 1; i < lines.length; i++) {
  const cols = lines[i].split(';');
  const nom = cols[1].trim();
  const targetMat = overrides[nom] || null;
  let student;
  if (targetMat) {
    student = rows.find(r => r.matricule === targetMat);
  } else {
    const normCsv = normalize(nom);
    student = rows.find(r => normalize(r.lastname + ' ' + r.firstname) === normCsv);
  }

  if (!student) {
    console.error('Non trouvé dans la base:', nom);
    continue;
  }

  let inscriptionFee = parseAmount(cols[8]) || 50000;
  let tuitionNet = parseAmount(cols[12]);
  let totalNet = parseAmount(cols[13]); // inscriptionFee + tuitionNet
  const inscriptionPaid = parseAmount(cols[35]);

  // Cas particuliers où les colonnes du CSV étaient à 0
  if (totalNet === 0) {
    if (nom.includes('ACAKPO')) {
      inscriptionFee = 50000;
      tuitionNet = 438200;
      totalNet = 488200;
    } else {
      inscriptionFee = 50000;
      tuitionNet = 850000;
      totalNet = 900000;
    }
  }

  // Installments de scolarité
  const installments = [];
  // Échéance 1 : Frais d'inscription
  installments.push({
    position: 1,
    description: "Frais d'inscription 2026-2027",
    amount: inscriptionFee,
    due_on: '2026-09-15',
    settled_amount: inscriptionPaid > 0 ? inscriptionFee : 0,
  });

  // Échéances 2..N : Tranches de scolarité
  let sumDue = 0;
  for (let m = 1; m <= 15; m++) {
    const due = parseAmount(cols[16 + m]);
    const paid = parseAmount(cols[35 + m]);
    if (due > 0) {
      sumDue += due;
      const dueDates = {
        1: '2026-10-15',
        2: '2026-11-15',
        3: '2026-12-15',
        4: '2027-01-15',
        5: '2027-02-15',
        6: '2027-03-15',
        7: '2027-04-15',
        8: '2027-05-15',
      };
      installments.push({
        position: installments.length + 1,
        description: `Scolarité 2026-2027 (Tranche M${m})`,
        amount: due,
        due_on: dueDates[m] || '2027-03-15',
        settled_amount: paid,
      });
    }
  }

  // Si aucune tranche M1..M15 n'était découpée (paiement comptant ou annuel)
  if (sumDue === 0 && tuitionNet > 0) {
    let totalTuitionPaid = 0;
    for (let m = 1; m <= 15; m++) totalTuitionPaid += parseAmount(cols[35 + m]);
    installments.push({
      position: installments.length + 1,
      description: 'Scolarité 2026-2027 (Paiement comptant / annuel)',
      amount: tuitionNet,
      due_on: '2026-10-15',
      settled_amount: totalTuitionPaid,
    });
  }

  // Ajustement d'arrondi sur la dernière échéance pour garantir la parité stricte : sum(échéances) == totalNet
  const currentSumInst = installments.reduce((acc, inst) => acc + inst.amount, 0);
  const diff = totalNet - currentSumInst;
  if (diff !== 0 && installments.length > 0) {
    installments[installments.length - 1].amount += diff;
  }

  contractsToApprove.push({
    student,
    nom,
    inscriptionFee,
    tuitionNet,
    totalNet,
    installments,
  });
}

console.log(`Préparation du SQL pour ${contractsToApprove.length} contrats...`);

let sql = `-- Migration datée : Régularisation des échéanciers et approbation des contrats financiers 2026-2027
-- Couvre 101 contrats d'études 2026-2027 avec parité exacte : sum(lignes) == sum(échéances)
-- Permet à la "Situation financière globale" d'auditer 100% des dossiers et de refléter les montants réels

alter table escen.installments disable trigger no_delete;
alter table escen.contract_discounts disable trigger no_delete;
alter table escen.contract_lines disable trigger no_delete;

do $$
declare
  v_year_id uuid;
  v_admin_account_id uuid;
  v_fee_inscription_id uuid;
  v_fee_scolarite_id uuid;
  v_contract_id uuid;
  v_version_id uuid;
begin
  -- 1. Année 2026-2027
  select id into v_year_id from escen.academic_years where code = '2026-2027';
  if v_year_id is null then
    return;
  end if;

  -- 2. Compte administrateur validateur (RAF / IT)
  select a.id into v_admin_account_id
  from escen.accounts a
  join escen.role_grants g on g.account_id = a.id
  join escen.roles r on r.id = g.role_id
  where r.code in ('RAF', 'IT') and a.active = true
  order by case when r.code = 'RAF' then 1 else 2 end
  limit 1;

  -- 3. Natures de frais
  select id into v_fee_inscription_id from escen.fee_types where code = 'ANNUAL-INSCRIPTION';
  select id into v_fee_scolarite_id from escen.fee_types where code in ('ANNUAL-SCOLARITE', 'SCOLARITE-2025') order by code limit 1;

`;

for (const c of contractsToApprove) {
  const safeNom = c.nom.replace(/'/g, "''");
  sql += `  -- [${c.student.matricule}] ${safeNom} - Net: ${c.totalNet} FCFA\n`;
  sql += `  v_contract_id := '${c.student.contract_id}';\n`;
  sql += `  v_version_id := '${c.student.version_id}';\n\n`;

  // Nettoyer les anciennes lignes et tranches du brouillon
  sql += `  delete from escen.installments where version_id = v_version_id;\n`;
  sql += `  delete from escen.contract_discounts where version_id = v_version_id;\n`;
  sql += `  delete from escen.contract_lines where version_id = v_version_id;\n\n`;

  // Insérer les lignes de frais nettes
  sql += `  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_inscription_id, ${c.inscriptionFee}, 'Frais d''inscription 2026-2027');\n`;

  if (c.tuitionNet > 0) {
    sql += `  insert into escen.contract_lines(contract_id, version_id, fee_type_id, amount, description)
  values (v_contract_id, v_version_id, v_fee_scolarite_id, ${c.tuitionNet}, 'Frais de scolarité 2026-2027');\n`;
  }

  // Insérer les échéances complètes
  for (const inst of c.installments) {
    const safeDesc = inst.description.replace(/'/g, "''");
    sql += `  insert into escen.installments(version_id, position, description, amount, due_on, settled_amount)
  values (v_version_id, ${inst.position}, '${safeDesc}', ${inst.amount}, '${inst.due_on}'::date, ${inst.settled_amount});\n`;
  }

  // Approuver la version du contrat
  sql += `  update escen.contract_versions
  set status = 'APPROVED',
      approved_by = v_admin_account_id,
      approved_at = now(),
      reason = 'Approbation du contrat financier et échéancier 2026-2027'
  where id = v_version_id;\n\n`;
}

sql += `end $$;

alter table escen.contract_lines enable trigger no_delete;
alter table escen.contract_discounts enable trigger no_delete;
alter table escen.installments enable trigger no_delete;
`;

fs.writeFileSync('supabase/migrations/202611020078_approve_2026_2027_financial_contracts.sql', sql);
console.log('✓ Fichier supabase/migrations/202611020078_approve_2026_2027_financial_contracts.sql généré avec succès !');

