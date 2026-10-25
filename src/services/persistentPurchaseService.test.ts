import assert from 'node:assert/strict';
import { ROLES } from '@/types/permissions';
import type { PersistentContext, RelationalSnapshot } from '@/types/persistence';
import { filterRelationalSnapshot } from './persistentPermissionsService';
import { purchaseCommandSchema, visiblePurchases } from './persistentPurchaseService';
const context: PersistentContext = { accountId: 'A', personId: 'P', authUserId: 'AUTH', roleCode: 'SITE', role: ROLES.SITE, permissions: ['purchase.view'], studentId: null, teacherId: null, grants: [{ role_code: 'SITE', role_name: ROLES.SITE, site_id: 'SITE1', academic_year_id: 'Y1', group_id: null }] };
const snapshot: RelationalSnapshot = { revision: 1, tables: {
  purchases: [{ id: 'P1', site_id: 'SITE1', academic_year_id: 'Y1' }, { id: 'P2', site_id: 'SITE2', academic_year_id: 'Y1' }, { id: 'P3', site_id: 'SITE1', academic_year_id: 'Y2' }],
  purchase_lines: [{ id: 'L1', purchase_id: 'P1' }, { id: 'L2', purchase_id: 'P2' }],
  purchase_receipts: [{ id: 'R1', purchase_id: 'P1', line_id: 'L1' }, { id: 'R2', purchase_id: 'P2', line_id: 'L2' }],
} };
assert.deepEqual(visiblePurchases(snapshot, context, null).map(row => row.id), ['P1']);
const scoped = filterRelationalSnapshot(snapshot, context);
assert.deepEqual(scoped.tables.purchase_lines.map(row => row.id), ['L1']);
assert.deepEqual(scoped.tables.purchase_receipts.map(row => row.id), ['R1']);
const base = { action: 'create', revision: 1, reason: 'Test', supplierId: null, siteId: null, lines: [{ description: 'Test', quantity: 1.001, unitAmount: 1 }] };
assert.ok(purchaseCommandSchema.safeParse(base).success);
assert.ok(!purchaseCommandSchema.safeParse({ ...base, lines: [{ ...base.lines[0], quantity: 1.00001 }] }).success);
console.log('Achats : sites et années isolés, réceptions reliées aux achats et quantités au millième contrôlées.');
