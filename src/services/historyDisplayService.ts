import type { HistoryCatalog, HistoryRecord } from '@/types/history';
import { HISTORY_REFERENCES } from '@/data/historyCatalog';
export function historyName(table: string, record: HistoryRecord, catalog: HistoryCatalog): string {
  const values = record.values;
  if (table === 'etudiants' || table === 'users') return `${values.prenom || ''} ${values.nom || ''}`.trim() || `#${record.sourceId}`;
  if (table === 'unite_valeurs') {
    const subject = catalog.references.matieres?.find(row => row.sourceId === String(values.matiere_id) && row.batchId === record.batchId);
    return subject ? String(subject.values.nom) : `Enseignement #${record.sourceId}`;
  }
  return String(values.nom || values.libelle || values.titre || values.title || values.name || values.code || `#${record.sourceId}`);
}
export function historyValue(key: string, value: unknown, record: HistoryRecord, catalog: HistoryCatalog): string {
  if (value === null || value === undefined || value === '') return 'Non renseigné';
  const table = HISTORY_REFERENCES[key] || (key === 'owner_id' ? String(record.values.owner_type).endsWith('Etudiant') ? 'etudiants' : String(record.values.owner_type).endsWith('User') ? 'users' : '' : '');
  if (table && catalog.references[table]) {
    const referenced = catalog.references[table].find(row => row.sourceId === String(value) && row.batchId === record.batchId);
    return referenced ? historyName(table, referenced, catalog) : `#${String(value)} · Référence non retrouvée`;
  }
  if (['active', 'published', 'is_online', 'annule', 'is_correct', 'is_obligatoire', 'is_multiple', 'is_photo', 'is_active', 'is_published', 'has_anonymat', 'est_en_abandon'].includes(key) && (value === '1' || value === '0' || value === 1 || value === 0 || typeof value === 'boolean')) return value === '1' || value === 1 || value === true ? 'Oui' : 'Non';
  if ((key.startsWith('montant') || key === 'frais_retrait_mm') && Number.isFinite(Number(value))) return `${Number(value).toLocaleString('fr-FR')} FCFA`;
  const labels: Record<string, string> = { actif: 'Actif', active: 'Actif', inactif: 'Inactif', en_cours: 'En cours', valide: 'Validé', validee: 'Validée', annule: 'Annulé', annulee: 'Annulée', scolarite: 'Scolarité', inscription: 'Inscription', especes: 'Espèces', virement: 'Virement', cheque: 'Chèque', mobile_money: 'Mobile money', present: 'Présent', absent: 'Absent', retard: 'Retard' };
  if (['statut', 'status', 'statut_scolaire', 'nature_paiement', 'mode_paiement'].includes(key) && labels[String(value).toLocaleLowerCase('fr')]) return labels[String(value).toLocaleLowerCase('fr')];
  if (typeof value === 'string' && /^(?:date|debut|fin|created_at|updated_at|starts|ends)/.test(key) && /^\d{4}-\d{2}-\d{2}(?:[ T]\d{2}:\d{2}(?::\d{2})?)?$/.test(value)) {
    const [date, time] = value.split(/[ T]/); const [year, month, day] = date.split('-');
    return `${day}/${month}/${year}${time ? ` à ${time.slice(0, 5)}` : ''}`;
  }
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}
