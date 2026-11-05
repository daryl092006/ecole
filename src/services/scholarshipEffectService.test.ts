import assert from 'node:assert/strict';
import {scholarshipFinancialEffect,scholarshipSavedTerms} from './scholarshipEffectService';
import type {RelationalSnapshot} from '@/types/persistence';
const award={id:'A',enrollment_id:'E',terms_snapshot:{percent:15,kind:'POURCENTAGE'}};
const snapshot:RelationalSnapshot={revision:1,tables:{
  financial_contracts:[{id:'C',enrollment_id:'E'}],
  contract_versions:[{id:'OLD',contract_id:'C',status:'SUPERSEDED'},{id:'V',contract_id:'C',status:'APPROVED'}],
  contract_discounts:[{id:'D',version_id:'OLD',scholarship_award_id:'A',amount:150}],
}};
assert.equal(scholarshipSavedTerms(award,{id:'S',percent:50}).percent,15);
assert.deepEqual(scholarshipFinancialEffect(snapshot,award),{financialStatus:'NOT_APPLIED',appliedAmount:0});
snapshot.tables.contract_discounts.push({id:'NEW',version_id:'V',scholarship_award_id:'A',amount:150});
assert.deepEqual(scholarshipFinancialEffect(snapshot,award),{financialStatus:'APPROVED',appliedAmount:150});
snapshot.tables.contract_versions[1].status='DRAFT';
assert.deepEqual(scholarshipFinancialEffect(snapshot,award),{financialStatus:'DRAFT',appliedAmount:150});
assert.deepEqual(scholarshipFinancialEffect({revision:1,tables:{}},award),{financialStatus:'NO_CONTRACT',appliedAmount:0});
console.log('Bourses : conditions figées, version active exacte et effet financier réel vérifiés.');
