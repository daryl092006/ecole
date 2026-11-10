export type PaymentPlan = 'ANNUEL' | 'TRIMESTRIEL' | 'BIMESTRIEL';

export interface TuitionCalculationInput {
  tuitionAmount: number;
  registrationAmount: number;
  paymentPlan: PaymentPlan;
  applyQuarterlyDiscount?: boolean;
  enrolledOn?: string;
  yearStartsOn?: string;
  yearEndsOn?: string;
}

export interface CalculatedInstallment {
  position: number;
  dueOn: string;
  amount: number;
  description: string;
}

export interface TuitionCalculationResult {
  rawTuition: number;
  registrationAmount: number;
  paymentPlan: PaymentPlan;
  discountPercent: number;
  discountAmount: number;
  scholarshipCode?: string;
  netTuition: number;
  netTotal: number;
  installments: CalculatedInstallment[];
}

function clampDate(dateStr: string, minDate: string, maxDate: string): string {
  if (minDate && dateStr < minDate) return minDate;
  if (maxDate && dateStr > maxDate) return maxDate;
  return dateStr;
}

function formatOffsetDate(year: number, month: number, day: number, minDate: string, maxDate: string): string {
  const m = String(month).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return clampDate(`${year}-${m}-${d}`, minDate, maxDate);
}

export function calculateTuitionSchedule(input: TuitionCalculationInput): TuitionCalculationResult {
  const rawTuition = Math.max(0, Math.round(Number(input.tuitionAmount) || 0));
  const registrationAmount = Math.max(0, Math.round(Number(input.registrationAmount) || 0));
  const plan: PaymentPlan = input.paymentPlan || 'ANNUEL';

  let discountPercent = 0;
  let scholarshipCode: string | undefined;

  if (plan === 'ANNUEL') {
    discountPercent = 15;
    scholarshipCode = 'REMISE-15';
  } else if (plan === 'TRIMESTRIEL' && input.applyQuarterlyDiscount === true) {
    discountPercent = 10;
    scholarshipCode = 'REMISE-10';
  } else {
    discountPercent = 0;
  }

  const discountAmount = Math.round(rawTuition * (discountPercent / 100));
  const netTuition = rawTuition - discountAmount;
  const netTotal = netTuition + registrationAmount;

  const today = new Date().toISOString().slice(0, 10);
  const minDate = input.yearStartsOn || today;
  const maxDate = input.yearEndsOn || '2099-12-31';
  const startDueOn = clampDate(input.enrolledOn || today, minDate, maxDate);

  // Déterminer l'année calendaire de rentrée
  const startYear = parseInt(startDueOn.slice(0, 4), 10) || new Date().getFullYear();
  const nextYear = startYear + 1;

  const installments: CalculatedInstallment[] = [];

  if (plan === 'ANNUEL') {
    // 1 seule tranche comptant
    installments.push({
      position: 1,
      dueOn: startDueOn,
      amount: netTotal,
      description: 'Paiement comptant intégral (Remise 15 % déduite)',
    });
  } else if (plan === 'TRIMESTRIEL') {
    // 3 tranches trimestrielles
    const base = Math.floor(netTuition / 3);
    const remainder = netTuition - base * 3;
    const t1Amount = base + registrationAmount + remainder;
    const t2Amount = base;
    const t3Amount = base;

    const t1Date = startDueOn;
    const t2Date = formatOffsetDate(nextYear, 1, 15, minDate, maxDate); // 15 Janvier
    const t3Date = formatOffsetDate(nextYear, 4, 15, minDate, maxDate); // 15 Avril

    installments.push(
      { position: 1, dueOn: t1Date, amount: t1Amount, description: 'Tranche 1/3 (Trimestriel · Inscription incluse)' },
      { position: 2, dueOn: t2Date, amount: t2Amount, description: 'Tranche 2/3 (Trimestriel)' },
      { position: 3, dueOn: t3Date, amount: t3Amount, description: 'Tranche 3/3 (Trimestriel)' }
    );
  } else {
    // BIMESTRIEL : 4 tranches (0% de remise)
    const base = Math.floor(netTuition / 4);
    const remainder = netTuition - base * 4;
    const t1Amount = base + registrationAmount + remainder;
    const t2Amount = base;
    const t3Amount = base;
    const t4Amount = base;

    const t1Date = startDueOn;
    const t2Date = formatOffsetDate(nextYear, 1, 15, minDate, maxDate); // 15 Janvier
    const t3Date = formatOffsetDate(nextYear, 3, 15, minDate, maxDate); // 15 Mars
    const t4Date = formatOffsetDate(nextYear, 5, 15, minDate, maxDate); // 15 Mai

    installments.push(
      { position: 1, dueOn: t1Date, amount: t1Amount, description: 'Tranche 1/4 (Bimestriel · Inscription incluse)' },
      { position: 2, dueOn: t2Date, amount: t2Amount, description: 'Tranche 2/4 (Bimestriel)' },
      { position: 3, dueOn: t3Date, amount: t3Amount, description: 'Tranche 3/4 (Bimestriel)' },
      { position: 4, dueOn: t4Date, amount: t4Amount, description: 'Tranche 4/4 (Bimestriel)' }
    );
  }

  return {
    rawTuition,
    registrationAmount,
    paymentPlan: plan,
    discountPercent,
    discountAmount,
    scholarshipCode,
    netTuition,
    netTotal,
    installments,
  };
}

