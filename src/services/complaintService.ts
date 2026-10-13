import type { ComplaintWorkflowStatus, Reclamation, RoleName } from '@/types';
import { hasPermission } from '@/permissions/rolePermissions';
import { ROLES } from '@/types/permissions';

const ALLOWED: Partial<Record<ComplaintWorkflowStatus, ComplaintWorkflowStatus[]>> = {
  NOUVELLE: ['EN_ANALYSE'], EN_ANALYSE: ['TRANSMISE_ENSEIGNANT'],
  TRANSMISE_ENSEIGNANT: ['AVIS_ENSEIGNANT'], AVIS_ENSEIGNANT: ['DECISION_ACADEMIQUE'],
  DECISION_ACADEMIQUE: ['CORRECTION_EVENTUELLE', 'CLOTUREE'], CORRECTION_EVENTUELLE: ['CLOTUREE'],
};

export function transitionComplaint(reclamation: Reclamation, target: ComplaintWorkflowStatus, actor: string, role: RoleName, comment?: string): Reclamation {
  const teacherOpinion = role === ROLES.ENS && reclamation.status === 'TRANSMISE_ENSEIGNANT' && target === 'AVIS_ENSEIGNANT';
  if (!teacherOpinion && !hasPermission(role, 'complaint.review')) throw new Error('Traitement non autorisé.');
  if (['AVIS_ENSEIGNANT', 'DECISION_ACADEMIQUE', 'CLOTUREE'].includes(target) && !comment?.trim()) throw new Error('Un avis ou motif de décision est obligatoire.');
  if (!ALLOWED[reclamation.status]?.includes(target)) throw new Error(`Transition de réclamation interdite : ${reclamation.status} → ${target}.`);
  return { ...reclamation, status: target, response: comment ?? reclamation.response, history: [...reclamation.history, {
    id: `CTH-${Date.now()}-${reclamation.history.length + 1}`, date: new Date().toISOString(), actor, role,
    from: reclamation.status, to: target, comment: comment?.trim() || undefined,
  }] };
}
