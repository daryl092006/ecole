export interface Room {
  code: string;
  name: string;
  building: string;
  capacity: number;
  status: 'Disponible' | 'Indisponible' | 'En maintenance';
}

export interface Session {
  id: string;
  classId: string;
  groupId: string;
  roomCode: string;
  date: string;
  startTime: string;
  endTime: string;
  status: 'Confirmé' | 'Déplacé' | 'Annulé';
  attendance?: Record<string, 'Présent' | 'Absent' | 'Retard' | 'Absent justifié'>;
}

export type BlockedPeriodType = 'JOUR_FERIE' | 'VACANCES' | 'FERMETURE' | 'EXAMEN' | 'AUTRE';

export interface BlockedPeriod {
  id: string;
  label: string;
  type: BlockedPeriodType;
  startDate: string;
  endDate: string;
}
