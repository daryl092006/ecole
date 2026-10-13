import type { BlockedPeriod, ClassItem, Group, Room, Session, Student } from '@/types';

interface ScheduleContext {
  classes: ClassItem[];
  rooms: Room[];
  sessions: Session[];
  students: Student[];
  groups: Group[];
  blockedPeriods: BlockedPeriod[];
}

interface ScheduleInput {
  classId: string;
  roomCode: string;
  date: string;
  startTime: string;
  endTime: string;
}

export type ScheduleResult =
  | { success: true; session: Session; classItem: ClassItem; room: Room }
  | { success: false; error: string };

function toMinutes(time: string): number | null {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return null;
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

export function planSession(input: ScheduleInput, context: ScheduleContext): ScheduleResult {
  const classItem = context.classes.find(item => item.id === input.classId);
  const room = context.rooms.find(item => item.code === input.roomCode);

  if (!classItem || !room) {
    return { success: false, error: 'Matière ou salle introuvable.' };
  }

  const parsedDate = new Date(input.date + 'T00:00:00Z');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date) || !Number.isFinite(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== input.date) {
    return { success: false, error: 'La date de la séance est invalide.' };
  }

  const start = toMinutes(input.startTime);
  const end = toMinutes(input.endTime);
  if (start === null || end === null) {
    return { success: false, error: 'Les horaires doivent respecter le format HH:MM.' };
  }
  if (start >= end) {
    return { success: false, error: "L'heure de début doit être antérieure à l'heure de fin." };
  }

  const blockedPeriod = context.blockedPeriods.find(period =>
    input.date >= period.startDate && input.date <= period.endDate
  );
  if (blockedPeriod) {
    return { success: false, error: `Planification impossible : ${blockedPeriod.label} (${blockedPeriod.type}).` };
  }

  if (room.status !== 'Disponible') {
    return { success: false, error: `La salle ${room.name} n'est pas disponible (${room.status}).` };
  }

  const group = context.groups.find(item => item.id === classItem.groupId);
  if (!group) {
    return { success: false, error: 'Le groupe associé à cet enseignement est introuvable.' };
  }

  const groupSize = context.students.filter(student => student.groupId === group.id).length;
  if (groupSize > room.capacity) {
    return {
      success: false,
      error: `La salle ${room.name} accueille ${room.capacity} personnes pour un groupe de ${groupSize} étudiants.`,
    };
  }

  for (const session of context.sessions) {
    if (session.date !== input.date || session.status === 'Annulé') continue;

    const sessionStart = toMinutes(session.startTime);
    const sessionEnd = toMinutes(session.endTime);
    if (sessionStart === null || sessionEnd === null || start >= sessionEnd || end <= sessionStart) continue;

    if (session.roomCode === input.roomCode) {
      return { success: false, error: `La salle ${room.name} est déjà occupée sur ce créneau.` };
    }

    const otherClass = context.classes.find(item => item.id === session.classId);
    if (otherClass?.teacherId === classItem.teacherId) {
      return { success: false, error: `L'enseignant ${classItem.teacher} donne déjà un cours sur ce créneau.` };
    }
    if (session.groupId === classItem.groupId) {
      return { success: false, error: `Le groupe ${group.name} a déjà un cours sur ce créneau.` };
    }
  }

  return {
    success: true,
    classItem,
    room,
    session: {
      id: `SESS-${String(context.sessions.length + 1).padStart(3, '0')}`,
      classId: input.classId,
      groupId: classItem.groupId,
      roomCode: input.roomCode,
      date: input.date,
      startTime: input.startTime,
      endTime: input.endTime,
      status: 'Confirmé',
    },
  };
}
