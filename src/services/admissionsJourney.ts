import type { AdmissionAction, AdmissionApplication } from '@/types/admissions';

export const ADMISSIONS_STEPS = ['Réception et vérification', 'Décision académique', 'Frais d’inscription', 'Dossier étudiant', 'Inscription finalisée'];

export function admissionsJourney(application: AdmissionApplication): { step: number; owner: string; instruction: string; primary: AdmissionAction | null } {
  if (!application.workflow_stage) {
    if (application.student_id || application.legacy_student_id || application.legacy_state?.admitted || application.legacy_state?.validated) {
      return { step: 4, owner: 'Traitement terminé', instruction: 'Candidature validée. L’étudiant est officiellement inscrit pour l’année scolaire.', primary: null };
    }
    return application.status === 'BROUILLON'
      ? { step: 0, owner: 'Candidat', instruction: 'Le candidat doit terminer et envoyer sa candidature. Ce brouillon ne peut pas être traité.', primary: null }
      : { step: 0, owner: 'Chargé de clientèle', instruction: 'Vérifiez les informations et les pièces déposées : transmettez directement le dossier à l’académie ou demandez une rectification au candidat.', primary: 'transmit' };
  }
  switch (application.workflow_stage) {
    case 'NOUVELLE': case 'RECUE': case 'VERIFICATION_ADMISSION': return { step: 0, owner: 'Chargé de clientèle', instruction: 'Vérifiez les informations et les pièces déposées : transmettez directement le dossier à l’académie s’il est conforme, ou demandez une rectification / un complément au candidat.', primary: 'transmit' };
    case 'INCOMPLET': case 'A_COMPLETER': return { step: 0, owner: 'Candidat · suivi par le chargé de clientèle', instruction: 'En attente de rectification par le candidat dans son espace personnel. Dès que les éléments sont conformes, vous pouvez transmettre le dossier à l’académie ou renvoyer une nouvelle demande de rectification.', primary: 'transmit' };
    case 'COMPLET': return { step: 1, owner: 'Chargé de clientèle', instruction: 'Le contrôle est validé. Transmettez le dossier à la direction académique pour décision.', primary: 'transmit' };
    case 'TRANSMIS_ACADEMIE': case 'ETUDE_ACADEMIQUE': return { step: 1, owner: 'Direction académique', instruction: 'Examinez le dossier du candidat puis prononcez directement l’admissibilité (qui débloque le paiement des frais d’inscription) ou un refus motivé.', primary: 'admissible' };
    case 'ADMISSIBLE': case 'ATTENTE_PAIEMENT': return { step: 2, owner: 'Chargé de clientèle', instruction: 'Saisissez le montant reçu, le moyen de paiement et la référence du reçu. Dès que les frais d’inscription sont soldés, l’admission devient officielle et le dossier étudiant (matricule, Microsoft 365, portail) est créé automatiquement.', primary: 'confirm_payment' };
    case 'ADMIS_OFFICIEL':
      if (!application.student_id) {
        return {
          step: 3,
          owner: 'Chargé de clientèle / Scolarité',
          instruction: 'Le candidat est admis officiellement. Créez son dossier étudiant pour générer son matricule automatique, ses accès officiels Microsoft 365 / Portail et transférer ses pièces.',
          primary: 'create_student',
        };
      }
      return { step: 4, owner: 'Traitement terminé', instruction: 'Admission officielle validée. L’étudiant est inscrit pour l’année scolaire avec ses accès et son dossier complet.', primary: null };
    case 'REFUSE': return { step: 1, owner: 'Traitement terminé', instruction: 'La candidature a été refusée. La décision et le courrier restent consultables ; aucune progression n’est disponible.', primary: null };
  }
}
