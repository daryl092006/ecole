import assert from 'node:assert/strict';
import {yearPreparation,assertYearPrepared,suggestNextAcademicYear,getPreviousYearConfigSummary,buildReconductChanges} from './yearPreparationService';
const snapshot={revision:1,tables:{academic_years:[{id:'Y',name:'2025-2026',code:'2025-2026',starts_on:'2025-10-13',ends_on:'2026-06-30',status:'OUVERTE'}],academic_offerings:[{id:'O',academic_year_id:'Y',curriculum_id:'C',level_id:'L'}],curricula:[{id:'C',program_id:'P'}],programs:[{id:'P',name:'Informatique'}],levels:[{id:'L',name:'Licence 1'}],groups:[{id:'G',academic_year_id:'Y',name:'Groupe A',level_id:'L'}],group_offerings:[{id:'GO',offering_id:'O',group_id:'G',academic_year_id:'Y',level_id:'L'}],subjects:[{id:'S',academic_year_id:'Y'}],curriculum_components:[{id:'CC',curriculum_id:'C',subject_id:'S'}],annual_fee_schedules:[{id:'F1',academic_year_id:'Y',category:'SCOLARITE',amount:100},{id:'F2',academic_year_id:'Y',category:'INSCRIPTION',program_id:'P',level_id:'L',amount:50}],annual_payment_channels:[{id:'PM',academic_year_id:'Y',name:'Caisse',method:'ESPECES'}]}};
assert.ok(yearPreparation(snapshot,'Y').every(check=>check.ready));assertYearPrepared(snapshot,'Y');
assert.throws(()=>assertYearPrepared(snapshot,'OTHER'),/Année non prête/);
assert.equal(yearPreparation({...snapshot,tables:{...snapshot.tables,annual_fee_schedules:[snapshot.tables.annual_fee_schedules[0]]}},'Y').find(check=>check.key==='registration')?.ready,false);
assert.equal(yearPreparation(snapshot,'Y').length,5);
assert.doesNotThrow(()=>assertYearPrepared({...snapshot,tables:{...snapshot.tables,subjects:[],curriculum_components:[]}},'Y'));
assert.equal(yearPreparation({...snapshot,tables:{...snapshot.tables,annual_payment_channels:[{...snapshot.tables.annual_payment_channels[0],archived_at:'2026-10-15'}]}},'Y').find(check=>check.key==='payments')?.ready,false);

// Test suggestNextAcademicYear
const suggestion = suggestNextAcademicYear(snapshot.tables.academic_years);
assert.equal(suggestion.code, '2026-2027');
assert.equal(suggestion.name, '2026-2027');
assert.equal(suggestion.starts_on, '2026-10-13');
assert.equal(suggestion.ends_on, '2027-06-30');
assert.equal(suggestion.previousYear?.id, 'Y');

// Test getPreviousYearConfigSummary
const summary = getPreviousYearConfigSummary(snapshot, 'Y');
assert.ok(summary);
assert.equal(summary.offeringsCount, 1);
assert.equal(summary.groupsCount, 1);
assert.equal(summary.feesCount, 2);
assert.equal(summary.tuitionCount, 1);
assert.equal(summary.registrationCount, 1);
assert.equal(summary.paymentChannelsCount, 1);
assert.equal(summary.totalCount, 5);

// Test buildReconductChanges
const changes = buildReconductChanges(snapshot, 'Y', 'NEW_YEAR', 'Reconduction test');
assert.equal(changes.length, 6); // 1 offering + 1 group + 1 group_offering + 2 fee schedules + 1 payment channel

// Test step-specific buildReconductChanges
const offeringChanges = buildReconductChanges(snapshot, 'Y', 'NEW_YEAR', 'Test', 'offerings');
assert.equal(offeringChanges.length, 1);
assert.equal(offeringChanges[0].table, 'academic_offerings');

const groupChanges = buildReconductChanges(snapshot, 'Y', 'NEW_YEAR', 'Test', 'groups');
assert.equal(groupChanges.length, 2); // group + group_offering
assert.ok(groupChanges.some(c => c.table === 'groups'));
assert.ok(groupChanges.some(c => c.table === 'group_offerings'));

const tuitionChanges = buildReconductChanges(snapshot, 'Y', 'NEW_YEAR', 'Test', 'tuition');
assert.equal(tuitionChanges.length, 1);
assert.equal(tuitionChanges[0].record.category, 'SCOLARITE');

const regChanges = buildReconductChanges(snapshot, 'Y', 'NEW_YEAR', 'Test', 'registration');
assert.equal(regChanges.length, 1);
assert.equal(regChanges[0].record.category, 'INSCRIPTION');

const paymentChanges = buildReconductChanges(snapshot, 'Y', 'NEW_YEAR', 'Test', 'payments');
assert.equal(paymentChanges.length, 1);
assert.equal(paymentChanges[0].table, 'annual_payment_channels');

const targetOfferings = changes.filter(c => c.table === 'academic_offerings').map(c => c.record as Record<string, unknown>);
const targetGroups = changes.filter(c => c.table === 'groups').map(c => c.record as Record<string, unknown>);
const targetGroupOfferings = changes.filter(c => c.table === 'group_offerings').map(c => c.record as Record<string, unknown>);
const targetFees = changes.filter(c => c.table === 'annual_fee_schedules').map(c => c.record as Record<string, unknown>);
const targetChannels = changes.filter(c => c.table === 'annual_payment_channels').map(c => c.record as Record<string, unknown>);

assert.equal(targetOfferings[0].academic_year_id, 'NEW_YEAR');
assert.equal(targetGroups[0].academic_year_id, 'NEW_YEAR');
assert.equal(targetGroupOfferings[0].academic_year_id, 'NEW_YEAR');
assert.equal(targetGroupOfferings[0].group_id, targetGroups[0].id);
assert.equal(targetGroupOfferings[0].offering_id, targetOfferings[0].id);
assert.equal(targetFees.length, 2);
assert.equal(targetChannels.length, 1);

// Applied to new snapshot, the target year passes all 5 year preparation checks
const reconductedSnapshot = {
  ...snapshot,
  tables: {
    ...snapshot.tables,
    academic_offerings: [...snapshot.tables.academic_offerings, ...targetOfferings],
    groups: [...snapshot.tables.groups, ...targetGroups],
    group_offerings: [...snapshot.tables.group_offerings, ...targetGroupOfferings],
    annual_fee_schedules: [...snapshot.tables.annual_fee_schedules, ...targetFees],
    annual_payment_channels: [...snapshot.tables.annual_payment_channels, ...targetChannels],
  }
};
assert.ok(yearPreparation(reconductedSnapshot as unknown as typeof snapshot, 'NEW_YEAR').every(check => check.ready));

console.log('Préparation annuelle : chaque formation couverte, année exacte et paramètres archivés exclus.');

