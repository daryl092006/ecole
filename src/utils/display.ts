const LABELS: Record<string, string> = {
  BROUILLON: 'Brouillon', SAISIES: 'Saisies', SOUMISES: 'Soumises',
  A_CONTROLER: 'À contrôler', VALIDEES: 'Validées', PUBLIEES: 'Publiées',
  NOUVELLE: 'Nouvelle', EN_ANALYSE: 'En analyse', TRANSMISE_ENSEIGNANT: 'Transmise à l’enseignant',
  AVIS_ENSEIGNANT: 'Avis de l’enseignant', DECISION_ACADEMIQUE: 'Décision académique',
  CORRECTION_EVENTUELLE: 'Correction éventuelle', CLOTUREE: 'Clôturée',
  OUVERT: 'Ouvert', EN_COURS: 'En cours', RESOLU: 'Résolu',
  PLANIFIE: 'Planifié', ANNULE: 'Annulé', ENREGISTRE: 'Enregistré',
  DEMANDE: 'Demandé', APPROUVE: 'Approuvé', REFUSE: 'Refusé', RECU: 'Reçu',
  DISPONIBLE: 'Disponible', MAINTENANCE: 'En maintenance', HORS_SERVICE: 'Hors service',
  CONFORME: 'Conforme', NON_CONFORME: 'Non conforme', A_VERIFIER: 'À vérifier',
  INSCRIT: 'Inscrit', REINSCRIT: 'Réinscrit', ABANDON: 'Abandon', SUSPENDU: 'Suspendu', DIPLOME: 'Diplômé',
  ADMIS: 'Admis', AJOURNE: 'Ajourné',
  EXAMEN: 'Première session', RATTRAPAGE: 'Rattrapage',
  IDENTITE: 'Pièce d’identité', BAC: 'Attestation ou diplôme du bac', RELEVE: 'Relevé antérieur',
  PHOTO: 'Photo d’identité', AUTRE: 'Autre pièce',
  PERMANENT: 'Permanent', VACATAIRE: 'Vacataire', STAGIAIRE: 'Stagiaire',
  ESPECES: 'Espèces', MOBILE_MONEY: 'Mobile money', VIREMENT: 'Virement bancaire',
  CHEQUE: 'Chèque', CARTE: 'Carte bancaire',
};

/** Presentation only: workflow values remain unchanged in services and exports. */
export function displayLabel(value: string): string {
  return LABELS[value] ?? value;
}

export function displayDate(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}

export function displayFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} octets`;
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} Ko`;
  return `${(bytes / (1024 * 1024)).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} Mo`;
}
