import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import { planPaymentAllocations } from '../src/services/paymentAllocationService.ts';

const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
for (const line of envContent.split('\n')) {
  const match = line.match(/^([A-Za-z0-9_]+)=(.*)$/);
  if (match) {
    env[match[1]] = match[2].trim();
  }
}

const client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

async function main() {
  const { data: snapshot } = await client.rpc('escen_backend_snapshot');
  const year2026 = snapshot.tables.academic_years.find(y => y.code === '2026-2027');
  
  const offeringIds = new Set(snapshot.tables.academic_offerings.filter(o => o.academic_year_id === year2026.id).map(o => o.id));
  const enrollments2026 = snapshot.tables.enrollments.filter(e => offeringIds.has(e.offering_id));
  const enrollmentIds = new Set(enrollments2026.map(e => e.id));

  const payments2026 = snapshot.tables.payments.filter(p => enrollmentIds.has(p.enrollment_id) && p.status === 'POSTED')
    .sort((a,b) => String(a.paid_on).localeCompare(String(b.paid_on)) || a.id.localeCompare(b.id));

  const adminAccount = snapshot.tables.accounts.find(a => a.username === 'it@escen.university') || snapshot.tables.accounts[0];

  const simSnapshot = JSON.parse(JSON.stringify(snapshot));
  simSnapshot.tables.payment_allocations = [];

  const allAllocations = [];

  for (const p of payments2026) {
    const plan = planPaymentAllocations(simSnapshot, {
      paymentId: p.id,
      enrollmentId: p.enrollment_id,
      amount: Number(p.amount),
      actorId: adminAccount.id
    });

    for (const change of plan.changes) {
      if (change.table === 'payment_allocations') {
        simSnapshot.tables.payment_allocations.push(change.record);
        allAllocations.push(change.record);
      }
    }
  }

  // Calculate new settled_amount for each installment
  const installmentSettled = new Map();
  for (const a of allAllocations) {
    if (a.installment_id) {
      installmentSettled.set(a.installment_id, (installmentSettled.get(a.installment_id) || 0) + Number(a.amount));
    }
  }

  // Generate SQL migration
  let sql = `-- Migration datée : Affectation en cascade des 92 règlements 2026-2027 et régularisation des échéances
-- 1. Insère les 222 lignes dans escen.payment_allocations (liaison paiement -> tranche & ligne de contrat)
-- 2. Met à jour les settled_amount des échéances pour respecter le plafond de chaque tranche
-- Traçabilité et conformité avec paymentAllocationService et la règle d'affectation au plus ancien

do $$
declare
  v_admin_id uuid;
  v_year_id uuid;
begin
  select id into v_year_id from escen.academic_years where code = '2026-2027';
  if v_year_id is null then
    return;
  end if;

  select a.id into v_admin_id
  from escen.accounts a
  join escen.role_grants g on g.account_id = a.id
  join escen.roles r on r.id = g.role_id
  where r.code in ('RAF', 'IT') and a.active = true
  order by case when r.code = 'RAF' then 1 else 2 end
  limit 1;

  if v_admin_id is null then
    raise exception 'Compte RAF/IT actif introuvable';
  end if;

  -- 1. Insertion des affectations détaillées dans escen.payment_allocations
`;

  for (const a of allAllocations) {
    sql += `  insert into escen.payment_allocations(id, payment_id, enrollment_id, contract_id, version_id, line_id, installment_id, amount, allocated_by)
  values ('${a.id}', '${a.payment_id}', '${a.enrollment_id}', '${a.contract_id}', '${a.version_id}', '${a.line_id}', '${a.installment_id}', ${a.amount}, v_admin_id)
  on conflict (id) do nothing;\n`;
  }

  sql += `\n  -- 2. Mise à jour des settled_amount sur les échéances 2026-2027\n`;

  // Get all 2026 installments
  const versions2026 = new Set(snapshot.tables.contract_versions.filter(v => {
    const c = snapshot.tables.financial_contracts.find(fc => fc.id === v.contract_id);
    return enrollmentIds.has(c?.enrollment_id);
  }).map(v => v.id));

  const all2026Insts = snapshot.tables.installments.filter(i => versions2026.has(i.version_id));

  for (const inst of all2026Insts) {
    const settled = installmentSettled.get(inst.id) || 0;
    sql += `  update escen.installments set settled_amount = ${settled} where id = '${inst.id}';\n`;
  }

  sql += `end $$;\n`;

  const migrationPath = 'supabase/migrations/202611020079_cascade_allocate_recovery_payments.sql';
  fs.writeFileSync(migrationPath, sql);
  console.log(`Generated migration: ${migrationPath} (${allAllocations.length} allocations, ${all2026Insts.length} installments updated)`);
}

main().catch(console.error);

