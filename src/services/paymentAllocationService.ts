import type { DatabaseRow, PersistentChange, RelationalSnapshot } from '@/types/persistence';
import type { AllocationTarget, PaymentAllocationDirectory } from '@/types/paymentAllocations';

const number = (row: DatabaseRow, key: string) => Number(row[key] || 0);
const rows = (snapshot: RelationalSnapshot, table: string) => snapshot.tables[table] || [];
export class PaymentAllocationError extends Error {}

export function effectivePayments(snapshot: RelationalSnapshot): DatabaseRow[] {
  const reversed = new Set(rows(snapshot, 'payment_reversals').map(row => row.payment_id));
  return rows(snapshot, 'payments').filter(row => row.status !== 'PENDING' && !reversed.has(row.id));
}

export function activePaymentAllocations(snapshot: RelationalSnapshot): DatabaseRow[] {
  const effective = new Set(effectivePayments(snapshot).map(row => row.id));
  const reversed = new Set(rows(snapshot, 'allocation_reversals').map(row => row.allocation_id));
  return rows(snapshot, 'payment_allocations').filter(row => effective.has(String(row.payment_id)) && !reversed.has(row.id));
}

export function paymentAllocationDirectory(snapshot: RelationalSnapshot, enrollmentIds: Set<string>): PaymentAllocationDirectory {
  const active = activePaymentAllocations(snapshot);
  const contractIds = new Set(rows(snapshot, 'financial_contracts').filter(row => enrollmentIds.has(String(row.enrollment_id))).map(row => row.id));
  const versions = new Set(rows(snapshot, 'contract_versions').filter(row => contractIds.has(String(row.contract_id)) && row.status === 'APPROVED').map(row => row.id));
  const reversals = new Set(rows(snapshot, 'payment_reversals').map(row => row.payment_id));
  return {
    payments: rows(snapshot, 'payments').filter(row => enrollmentIds.has(String(row.enrollment_id))).map(row => {
      const pending = row.status === 'PENDING', cancelled = reversals.has(row.id);
      const available = pending || cancelled ? 0 : number(row, 'amount') - rows(snapshot, 'refunds').filter(refund => refund.payment_id === row.id).reduce((sum, refund) => sum + number(refund, 'amount'), 0);
      const allocations = active.filter(allocation => allocation.payment_id === row.id);
      const allocated = allocations.reduce((sum, allocation) => sum + number(allocation, 'amount'), 0);
      const byInstallment = new Map<string, number>();
      for (const allocation of allocations) if (allocation.installment_id) {
        const id = String(allocation.installment_id);
        byInstallment.set(id, (byInstallment.get(id) || 0) + number(allocation, 'amount'));
      }
      return { id: row.id, enrollmentId: String(row.enrollment_id), reference: String(row.reference), amount: number(row, 'amount'), available, allocated, unallocated: available - allocated, pending, cancelled,
        allocations: [...byInstallment].map(([installmentId, amount]) => ({ installmentId, amount })) };
    }),
    installments: rows(snapshot, 'installments').filter(row => versions.has(String(row.version_id))).sort((a, b) => String(a.due_on).localeCompare(String(b.due_on)) || number(a, 'position') - number(b, 'position') || a.id.localeCompare(b.id)).map(row => {
      const version = rows(snapshot, 'contract_versions').find(version => version.id === row.version_id)!;
      const contract = rows(snapshot, 'financial_contracts').find(contract => contract.id === version.contract_id)!;
      return { id: row.id, versionId: version.id, enrollmentId: String(contract.enrollment_id), description: String(row.description), dueOn: String(row.due_on), amount: number(row, 'amount'),
        settled: active.filter(allocation => allocation.installment_id === row.id).reduce((sum, allocation) => sum + number(allocation, 'amount'), 0) };
    }),
  };
}

interface AllocationCommand {
  paymentId: string; enrollmentId: string; amount: number; actorId: string;
  targets?: AllocationTarget[]; reason?: string;
}

export function planPaymentAllocations(snapshot: RelationalSnapshot, command: AllocationCommand) {
  const { paymentId, enrollmentId, actorId, targets } = command;
  const replacing = targets !== undefined;
  const fail = (message: string): never => { throw new PaymentAllocationError(message); };
  let available = command.amount;
  if (replacing) {
    const payment = effectivePayments(snapshot).find(row => row.id === paymentId && row.enrollment_id === enrollmentId);
    if (!payment) fail('Ce paiement est introuvable, en attente ou annulé.');
    available = number(payment!, 'amount') - rows(snapshot, 'refunds').filter(row => row.payment_id === paymentId).reduce((sum, row) => sum + number(row, 'amount'), 0);
    if (!command.reason || command.reason.trim().length < 3 || command.reason.trim().length > 1000) fail('Un motif de 3 à 1000 caractères est obligatoire.');
  }
  if (!Number.isSafeInteger(available) || available < 0 || (!replacing && available === 0)) fail('Montant disponible invalide.');
  const active = activePaymentAllocations(snapshot);
  const other = active.filter(row => !replacing || row.payment_id !== paymentId);
  const contract = rows(snapshot, 'financial_contracts').find(row => row.enrollment_id === enrollmentId);
  const version = contract && rows(snapshot, 'contract_versions').find(row => row.contract_id === contract.id && row.status === 'APPROVED');
  if (!version) {
    if (replacing) fail('Approuvez le contrat avant de réaffecter ce paiement.');
    return { changes: [] as PersistentChange[], allocated: 0, unallocated: available };
  }
  const lines = rows(snapshot, 'contract_lines').filter(row => row.version_id === version.id).sort((a, b) => a.id.localeCompare(b.id)).map(row => ({ id: row.id, remaining: Math.max(0, number(row, 'amount')
    - rows(snapshot, 'contract_discounts').filter(discount => discount.line_id === row.id).reduce((sum, discount) => sum + number(discount, 'amount'), 0)
    - rows(snapshot, 'credit_notes').filter(note => note.line_id === row.id).reduce((sum, note) => sum + number(note, 'amount'), 0)
    - other.filter(allocation => allocation.line_id === row.id).reduce((sum, allocation) => sum + number(allocation, 'amount'), 0)) }));
  const installments = rows(snapshot, 'installments').filter(row => row.version_id === version.id).sort((a, b) => String(a.due_on).localeCompare(String(b.due_on)) || number(a, 'position') - number(b, 'position') || a.id.localeCompare(b.id));
  const capacity = (id: string) => {
    const installment = installments.find(row => row.id === id);
    return installment ? Math.max(0, number(installment, 'amount') - other.filter(row => row.installment_id === id).reduce((sum, row) => sum + number(row, 'amount'), 0)) : -1;
  };
  if (targets) {
    if (!targets.length || new Set(targets.map(row => row.installmentId)).size !== targets.length) fail('Choisissez des échéances distinctes.');
    for (const target of targets) {
      if (!Number.isSafeInteger(target.amount) || target.amount <= 0) fail('Chaque affectation doit être un montant entier positif.');
      if (capacity(target.installmentId) < target.amount) fail('Échéance hors du contrat approuvé ou montant supérieur à son solde.');
    }
    const requested = targets.reduce((sum, target) => sum + target.amount, 0);
    if (requested > available) fail('Le montant réaffecté dépasse le paiement disponible après remboursements.');
    if (requested > lines.reduce((sum, line) => sum + line.remaining, 0)) fail('Le montant réaffecté dépasse le solde des lignes de frais.');
  }
  const changes: PersistentChange[] = replacing ? active.filter(row => row.payment_id === paymentId).map(row => ({ table: 'allocation_reversals', operation: 'insert', record: { id: crypto.randomUUID(), allocation_id: row.id, actor_id: actorId, reason: command.reason!.trim() } })) : [];
  let remaining = available;
  for (const installment of installments) {
    const total = lines.reduce((sum, line) => sum + line.remaining, 0);
    const budget = targets ? targets.find(row => row.installmentId === installment.id)?.amount || 0 : Math.min(remaining, capacity(installment.id), total);
    if (budget <= 0) continue;
    // Largest remainders keep the prorata exact in whole FCFA, including large amounts.
    const shares = lines.filter(line => line.remaining > 0).map(line => {
      const product = BigInt(budget) * BigInt(line.remaining);
      return { line, amount: Number(product / BigInt(total)), remainder: product % BigInt(total) };
    }).sort((a, b) => a.remainder === b.remainder ? a.line.id.localeCompare(b.line.id) : a.remainder > b.remainder ? -1 : 1);
    let residue = budget - shares.reduce((sum, share) => sum + share.amount, 0);
    for (const share of shares) {
      if (residue > 0) { share.amount++; residue--; }
      if (share.amount === 0) continue;
      changes.push({ table: 'payment_allocations', operation: 'insert', record: { id: crypto.randomUUID(), payment_id: paymentId, enrollment_id: enrollmentId, contract_id: contract!.id, version_id: version.id, line_id: share.line.id, installment_id: installment.id, amount: share.amount, allocated_by: actorId } });
      share.line.remaining -= share.amount;
    }
    remaining -= budget;
  }
  return { changes, allocated: available - remaining, unallocated: remaining };
}
