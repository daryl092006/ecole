import assert from 'node:assert/strict';
import { ROLES } from '@/types/permissions';
import type { PersistentContext, RelationalSnapshot } from '@/types/persistence';
import { visibleSupportTickets } from './persistentSupportService';
import { filterRelationalSnapshot } from './persistentPermissionsService';

const context: PersistentContext = { accountId: 'SELF', personId: 'P', authUserId: 'AUTH', roleCode: 'IT', role: ROLES.IT, permissions: ['system.support.manage'], studentId: null, teacherId: null, grants: [{ role_code: 'IT', role_name: ROLES.IT, site_id: null, group_id: null, academic_year_id: 'Y1' }] };
const snapshot: RelationalSnapshot = { revision: 1, tables: {
  support_tickets: [{ id: 'T1', author_id: 'OTHER', academic_year_id: 'Y1' }, { id: 'T2', author_id: 'OTHER', academic_year_id: 'Y2' }, { id: 'T3', author_id: 'SELF', academic_year_id: 'Y2' }],
  support_messages: [{ id: 'M1', ticket_id: 'T1' }, { id: 'M2', ticket_id: 'T2' }],
  support_files: [{ id: 'F1', message_id: 'M1' }, { id: 'F2', message_id: 'M2' }],
} };
assert.deepEqual(visibleSupportTickets(snapshot, context, null).map(row => row.id), ['T1', 'T3']);
assert.deepEqual(visibleSupportTickets(snapshot, context, 'Y2').map(row => row.id), ['T3']);
const filtered = filterRelationalSnapshot(snapshot, context);
assert.deepEqual(filtered.tables.support_messages.map(row => row.id), ['M1']);
assert.deepEqual(filtered.tables.support_files.map(row => row.id), ['F1']);
const siteContext = { ...context, grants: context.grants.map(grant => ({ ...grant, site_id: 'SITE' })) };
assert.deepEqual(visibleSupportTickets(snapshot, siteContext, null).map(row => row.id), ['T3']);
assert.deepEqual(visibleSupportTickets(snapshot, { ...context, permissions: [] }, null).map(row => row.id), ['T3']);
console.log('Support : auteur, année, périmètres des agents, messages et pièces privés vérifiés.');
