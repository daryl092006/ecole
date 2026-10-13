import type { Level } from '@/types';

export const SYSTEM_LEVELS: Level[] = [
  { id: 'LEVEL-L1', code: 'L1', name: 'Licence 1', cycle: 'LICENCE', order: 1, active: true },
  { id: 'LEVEL-L2', code: 'L2', name: 'Licence 2', cycle: 'LICENCE', order: 2, active: true },
  { id: 'LEVEL-L3', code: 'L3', name: 'Licence 3', cycle: 'LICENCE', order: 3, active: true },
  { id: 'LEVEL-M1', code: 'M1', name: 'Master 1', cycle: 'MASTER', order: 1, active: true },
  { id: 'LEVEL-M2', code: 'M2', name: 'Master 2', cycle: 'MASTER', order: 2, active: true },
];

export const SEMESTERS_BY_LEVEL: Record<Level['code'], number[]> = {
  L1: [1, 2],
  L2: [3, 4],
  L3: [5, 6],
  M1: [1, 2],
  M2: [3, 4],
};

