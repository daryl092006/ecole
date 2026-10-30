import type { AdmissionAction, AdmissionApplication } from '@/types/admissions';

export const ADMISSIONS_STEPS = ['Réception et vérification', 'Décision académique', 'Frais d’inscription', 'Dossier étudiant', 'Inscription finalisée'];

export function admissionsJourney(application: AdmissionApplication): { step: number; owner: string; instruction: string; primary: AdmissionAction | null } {
  if (!application.workflow_stage) {
    if (application.student_id || application.legacy_student_id) {
      return { step: 4, owner: 'Traitement terminé', instruction: 'L’admission est officielle et le dossier étudiant est relié. Les démarches de candidature sont terminées.', primary: null };
    }
    if (application.legacy_state?.admitted || application.legacy_state?.validated) {
      return { step: 4, owner: 'Traitement terminé', instruction: 'Candidature validée et admise. Dossier officiel confirmé.', primary: null };
    }
    return application.status === 'BROUILLON'
      ? { step: 0, owner: 'Candidat', instruction: 'Le candidat doit terminer et envoyer sa candidature. Ce brouillon ne peut pas être traité.', primary: null }
      : { step: 0, owner: 'Chargé de clientèle', instruction: 'Dossier en cours d’étude.', primary: 'review' };
  }
  switch (application.workflow_stage) {
    case 'NOUVELLE': case 'RECUE': return { step: 0, owner: 'Chargé de clientèle', instruction: 'Ouvrir la vérification, contrôler les informations et les pièces, puis valider le dossier ou demander un complément.', primary: 'review' };
    case 'VERIFICATION_ADMISSION': return { step: 0, owner: 'Chargé de clientèle', instruction: 'Contrôler l’identité, les tuteurs et chaque pièce obligatoire avant de valider la complétude.', primary: 'complete' };
    case 'INCOMPLET': case 'A_COMPLETER': return { step: 0, owner: 'Candidat · suivi par le chargé de clientèle', instruction: 'Le candidat doit compléter son dossier depuis son espace personnel. Vous pouvez tracer une relance ou reprendre la vérification si les éléments sont disponibles.', primary: 'review' };
    case 'COMPLET': return { step: 1, owner: 'Chargé de clientèle', instruction: 'Le contrôle est terminé. Transmettre le dossier à la direction académique pour qu’elle puisse prendre sa décision.', primary: 'transmit' };
    case 'TRANSMIS_ACADEMIE': return { step: 1, owner: 'Direction académique', instruction: 'Prendre en charge le dossier transmis, puis examiner la candidature avant de décider.', primary: 'study' };
    case 'ETUDE_ACADEMIQUE': return { step: 1, owner: 'Direction académique', instruction: 'Examiner le dossier puis prononcer l’admissibilité ou un refus motivé. L’admissibilité ouvre le règlement des frais ; elle ne vaut pas admission officielle.', primary: 'admissible' };
    case 'ADMISSIBLE': case 'ATTENTE_PAIEMENT': return { step: 2, owner: 'Chargé de clientèle', instruction: 'Indiquer le montant réellement reçu, le moyen de paiement et la référence du reçu. Un paiement partiel conserve l’attente ; le solde intégral déclenche l’admission officielle.', primary: 'confirm_payment' };
    case 'ADMIS_OFFICIEL': return (application.student_id || application.legacy_student_id)
      ? { step: 4, owner: 'Traitement terminé', instruction: 'L’admission est officielle et le dossier étudiant est relié. Les démarches de candidature sont terminées.', primary: null }
      : { step: 3, owner: 'Chargé de clientèle', instruction: 'Les frais sont réglés. Créer le dossier étudiant ou sélectionner explicitement un dossier existant pour terminer le traitement.', primary: 'create_student' };
    case 'REFUSE': return { step: 1, owner: 'Traitement terminé', instruction: 'La candidature a été refusée. La décision et le courrier restent consultables ; aucune progression n’est disponible.', primary: null };
  }
}
