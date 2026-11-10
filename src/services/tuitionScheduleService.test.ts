import assert from 'node:assert/strict';
import { calculateTuitionSchedule } from './tuitionScheduleService';

// Test 1 : L1 IA avec double diplomation (850 000 FCFA + 50 000 FCFA)
// 1.A Annuel : 15% de remise
const annualDD = calculateTuitionSchedule({
  tuitionAmount: 850000,
  registrationAmount: 50000,
  paymentPlan: 'ANNUEL',
  enrolledOn: '2026-10-15',
  yearStartsOn: '2026-10-12',
  yearEndsOn: '2027-06-30',
});
assert.equal(annualDD.discountPercent, 15);
assert.equal(annualDD.discountAmount, 127500);
assert.equal(annualDD.netTuition, 722500);
assert.equal(annualDD.netTotal, 772500);
assert.equal(annualDD.installments.length, 1);
assert.equal(annualDD.installments[0].amount, 772500);

// 1.B Trimestriel sans remise : 0%
const triNoDiscount = calculateTuitionSchedule({
  tuitionAmount: 850000,
  registrationAmount: 50000,
  paymentPlan: 'TRIMESTRIEL',
  applyQuarterlyDiscount: false,
  enrolledOn: '2026-10-15',
  yearStartsOn: '2026-10-12',
  yearEndsOn: '2027-06-30',
});
assert.equal(triNoDiscount.discountPercent, 0);
assert.equal(triNoDiscount.discountAmount, 0);
assert.equal(triNoDiscount.netTuition, 850000);
assert.equal(triNoDiscount.netTotal, 900000);
assert.equal(triNoDiscount.installments.length, 3);
const triNoDiscountSum = triNoDiscount.installments.reduce((sum, inst) => sum + inst.amount, 0);
assert.equal(triNoDiscountSum, 900000);
assert.equal(triNoDiscount.installments[0].amount, 333334);
assert.equal(triNoDiscount.installments[1].amount, 283333);
assert.equal(triNoDiscount.installments[2].amount, 283333);

// 1.C Trimestriel avec remise 10%
const triWithDiscount = calculateTuitionSchedule({
  tuitionAmount: 850000,
  registrationAmount: 50000,
  paymentPlan: 'TRIMESTRIEL',
  applyQuarterlyDiscount: true,
  enrolledOn: '2026-10-15',
  yearStartsOn: '2026-10-12',
  yearEndsOn: '2027-06-30',
});
assert.equal(triWithDiscount.discountPercent, 10);
assert.equal(triWithDiscount.discountAmount, 85000);
assert.equal(triWithDiscount.netTuition, 765000);
assert.equal(triWithDiscount.netTotal, 815000);
assert.equal(triWithDiscount.installments.length, 3);
const triWithDiscountSum = triWithDiscount.installments.reduce((sum, inst) => sum + inst.amount, 0);
assert.equal(triWithDiscountSum, 815000);
assert.equal(triWithDiscount.installments[0].amount, 305000);
assert.equal(triWithDiscount.installments[1].amount, 255000);
assert.equal(triWithDiscount.installments[2].amount, 255000);

// 1.D Bimestriel (0%)
const bimestriel = calculateTuitionSchedule({
  tuitionAmount: 850000,
  registrationAmount: 50000,
  paymentPlan: 'BIMESTRIEL',
  enrolledOn: '2026-10-15',
  yearStartsOn: '2026-10-12',
  yearEndsOn: '2027-06-30',
});
assert.equal(bimestriel.discountPercent, 0);
assert.equal(bimestriel.discountAmount, 0);
assert.equal(bimestriel.netTuition, 850000);
assert.equal(bimestriel.netTotal, 900000);
assert.equal(bimestriel.installments.length, 4);
const biSum = bimestriel.installments.reduce((sum, inst) => sum + inst.amount, 0);
assert.equal(biSum, 900000);
assert.equal(bimestriel.installments[0].amount, 262500);
assert.equal(bimestriel.installments[1].amount, 212500);
assert.equal(bimestriel.installments[2].amount, 212500);
assert.equal(bimestriel.installments[3].amount, 212500);

// Test 2 : L1 IA normal sans double diplôme (425 000 FCFA + 50 000 FCFA)
const biNormal = calculateTuitionSchedule({
  tuitionAmount: 425000,
  registrationAmount: 50000,
  paymentPlan: 'BIMESTRIEL',
  enrolledOn: '2026-10-15',
  yearStartsOn: '2026-10-12',
  yearEndsOn: '2027-06-30',
});
assert.equal(biNormal.netTuition, 425000);
assert.equal(biNormal.netTotal, 475000);
assert.equal(biNormal.installments.length, 4);
assert.equal(biNormal.installments[0].amount, 156250);
assert.equal(biNormal.installments[1].amount, 106250);
assert.equal(biNormal.installments[2].amount, 106250);
assert.equal(biNormal.installments[3].amount, 106250);

console.log('✓ Modèle de réduction et calcul des échéanciers (annuel, trimestriel, bimestriel) validé.');

