import referenceMap from '@/data/relationalReferences.json';
import { NATIVE_FIELD_LABELS } from '@/data/domainWorkspaces';
import type { DatabaseRow, RelationalSnapshot } from '@/types/persistence';
const references: Record<string, Record<string, string>> = referenceMap;
export const connectedFieldLabel = (key: string) => NATIVE_FIELD_LABELS[key] || ({ candidate_id: 'Candidat à l’évaluation', component_id: 'Composante pédagogique', version_id: 'Version du contrat', offering_semester_id: 'Semestre de l’offre', file_id: 'Pièce jointe', body: 'Message', currency: 'Devise', paid_on: 'Date du versement', payer_name: 'Payeur', terms_snapshot: 'Conditions de la bourse', happened_at: 'Date de l’opération', reversed_at: 'Date d’annulation', old_status: 'État précédent', new_status: 'Nouvel état', unit_amount: 'Montant unitaire FCFA', average: 'Moyenne', held_at: 'Date du jury', minutes: 'Compte rendu', absence_status: 'État d’absence', comment: 'Commentaire', recorded_at: 'Enregistré le', arrived_at: 'Arrivée', left_at: 'Départ', withdrawn_at: 'Retiré le', expires_at: 'Expire le', withdrawal_reason: 'Motif du retrait' } as Record<string, string>)[key] || key.replace(/_/g, ' ');

export function connectedRecordName(table: string, row: DatabaseRow, snapshot: RelationalSnapshot, depth = 0): string {
  const name = [row.firstname, row.lastname].filter(Boolean).join(' ') || row.name || row.title || row.reference || row.code;
  if (name) return String(name);
  if (depth < 4) {
    const key = ({ students: 'person_id', staff: 'person_id', teachers: 'staff_id', enrollments: 'student_id', evaluation_candidates: 'enrollment_id', grades: 'candidate_id', teaching_assignments: 'teacher_id', academic_offerings: 'curriculum_id', contract_versions: 'contract_id', curriculum_components: 'unit_id' } as Record<string, string>)[table];
    const target = key && references[table]?.[key]; const linked = target && snapshot.tables[target]?.find(value => value.id === row[key]);
    if (target && linked) return connectedRecordName(target, linked, snapshot, depth + 1);
  }
  return `Référence ${row.id}`;
}

export function connectedRecordValue(table: string, key: string, value: unknown, snapshot: RelationalSnapshot): string {
  if (value === null || value === undefined || value === '') return 'Non renseigné';
  const target = references[table]?.[key];
  if (target) {
    const row = snapshot.tables[target]?.find(item => item.id === value);
    return row ? connectedRecordName(target, row, snapshot) : 'Référence non accessible ou non retrouvée';
  }
  if (typeof value === 'boolean') return value ? 'Oui' : 'Non';
  if (['amount', 'unit_amount', 'withdrawal_fee'].includes(key) && Number.isFinite(Number(value))) return Number(value).toLocaleString('fr-FR') + ' FCFA';
  const states: Record<string, string> = { OPEN: 'Ouverte', IN_PROGRESS: 'En cours', WAITING: 'En attente', RESOLVED: 'Résolue', CLOSED: 'Clôturée', DRAFT: 'Brouillon', APPROVED: 'Approuvé', SUPERSEDED: 'Remplacé par une nouvelle version', INSCRIT: 'Inscrit', REINSCRIT: 'Réinscrit', PRESENT: 'Présent', ABSENT: 'Absent', ABSENT_JUSTIFIE: 'Absent justifié', RETARD: 'Retard', ESPECES: 'Espèces', VIREMENT: 'Virement', MOBILE_MONEY: 'Mobile money', CHEQUE: 'Chèque', CARTE: 'Carte', BROUILLON: 'Brouillon', SAISIES: 'Saisies', SOUMISES: 'Soumises', A_CONTROLER: 'À contrôler', VALIDEES: 'Validées', PUBLIEES: 'Publiées', NOUVELLE: 'Nouvelle', EN_ANALYSE: 'En analyse', TRANSMISE_ENSEIGNANT: 'Transmise à l’enseignant', AVIS_ENSEIGNANT: 'Avis enseignant', DECISION_ACADEMIQUE: 'Décision académique', CORRECTION_EVENTUELLE: 'Correction éventuelle', CLOTUREE: 'Clôturée', DEMANDE: 'Demandé', APPROUVE: 'Approuvé', REFUSE: 'Refusé', RECU: 'Reçu', RECEPTION_PARTIELLE: 'Réception partielle', A_VERIFIER: 'À vérifier', CONFORME: 'Conforme', NON_CONFORME: 'Non conforme', PLANIFIE: 'Planifié', TERMINE: 'Terminé', ANNULE: 'Annulé', REPORTE: 'Reporté' };
  if (states[String(value)]) return states[String(value)];
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  if (typeof value === 'string' && /(?:_at|_on|valid_from|valid_until)$/.test(key) && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    const date = new Date(value); if (!Number.isNaN(date.getTime())) return date.toLocaleString('fr-FR', { timeZone: 'Africa/Lome', ...(value.length === 10 ? { year: 'numeric', month: '2-digit', day: '2-digit' } : {}) });
  }
  return String(value);
}
