'use client';
import { useState } from 'react';
import { DEFAULT_SETTINGS, type Dataset } from '@/types/application';
export type CampusRecords = Pick<Dataset, 'settings' | 'enrollments' | 'juryDecisions' | 'exams' | 'staff' | 'purchases' | 'assets' | 'documents'>;
export function useCampusRecords() {
  return useState<CampusRecords>({ settings: [{ ...DEFAULT_SETTINGS }], enrollments: [], juryDecisions: [], exams: [], staff: [], purchases: [], assets: [], documents: [] });
}
