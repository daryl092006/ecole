export interface JourneyStage { title: string; description: string; sections: string[]; }
export const MODULE_JOURNEYS: Record<string, JourneyStage[]> = {
  academique: [
    { title: 'Préparer l’organisation', description: 'Renseigner les filières, les matières, les années et les groupes avant de les utiliser.', sections: ['acad_program', 'acad_reference', 'acad_settings'] },
    { title: 'Organiser les enseignements', description: 'Retrouver les affectations, consulter les séances et les présences.', sections: ['acad_schedule', 'acad_attendance'] },
    { title: 'Préparer et retrouver les épreuves', description: 'Composer un sujet préparatoire, puis consulter les épreuves et leurs copies.', sections: ['acad_subjects', 'acad_assessments', 'acad_exams', 'acad_resits'] },
    { title: 'Suivre les résultats', description: 'Retrouver les notes, les réclamations et les relevés, avec leurs états disponibles.', sections: ['acad_grades', 'acad_complaints', 'acad_jury'] },
  ],
  etudiants: [
    { title: 'Retrouver ou compléter un dossier', description: 'Commencer par l’identité de l’étudiant ; vérifier son parcours et ses pièces avant une opération.', sections: ['stud_list', 'stud_status', 'stud_cards'] },
    { title: 'Vérifier l’accès à la plateforme', description: 'Le dossier de scolarité et le compte de connexion ont des fonctions distinctes.', sections: ['stud_accounts'] },
  ],
  finance: [
    { title: 'Comprendre les frais', description: 'Retrouver les tarifs, les frais individuels et les bourses avant de consulter les versements.', sections: ['fin_kpis', 'fin_contracts'] },
    { title: 'Contrôler les versements', description: 'Consulter les transactions et les échéances avec leurs références conservées.', sections: ['fin_payments'] },
    { title: 'Préparer un relevé', description: 'Choisir les données et le périmètre avant de télécharger un export.', sections: ['fin_reports'] },
  ],
  personnel: [
    { title: 'Tenir les dossiers professionnels', description: 'Créer ou compléter une identité et retrouver ses contrats et ses affectations.', sections: ['staff_records', 'staff_teachers'] },
    { title: 'Gérer les accès', description: 'Vérifier les permissions du rôle avant de l’attribuer à un compte.', sections: ['staff_roles', 'staff_permissions', 'staff_list'] },
  ],
  marketing: [
    { title: 'Consulter la communication', description: 'Retrouver les publications, les informations urgentes et les pièces conservées.', sections: ['comm_news', 'comm_announcements'] },
  ],
  logistique: [
    { title: 'Référencer les fournisseurs', description: 'Renseigner les coordonnées pour identifier les interlocuteurs de l’établissement.', sections: ['log_suppliers'] },
    { title: 'Suivre les achats', description: 'Distinguer la demande, la décision et la réception ; consulter la disponibilité du traitement.', sections: ['log_purchases'] },
    { title: 'Tenir l’inventaire', description: 'Identifier chaque équipement, son site, sa localisation et son état.', sections: ['log_assets'] },
  ],
  systeme: [
    { title: 'Contrôler les données', description: 'Examiner les dossiers et les anomalies sans modifier les sources originales.', sections: ['sys_data'] },
    { title: 'Tracer et exporter', description: 'Retrouver les événements et choisir précisément les lignes à exporter.', sections: ['sys_logs', 'sys_backups'] },
    { title: 'Assistance', description: 'Consulter le périmètre d’assistance disponible et les catégories conservées.', sections: ['sys_support'] },
  ],
};

export const SECTION_TASKS: Record<string, string> = {
  acad_program: 'Gérer les filières et les matières', acad_reference: 'Organiser les années, les groupes et les locaux', acad_settings: 'Consulter les règles à confirmer',
  acad_schedule: 'Retrouver une séance', acad_attendance: 'Consulter une séance réalisée', acad_subjects: 'Préparer un sujet', acad_assessments: 'Consulter les contrôles continus', acad_exams: 'Consulter les examens et leurs copies', acad_resits: 'Consulter les rattrapages', acad_grades: 'Retrouver une note', acad_complaints: 'Suivre une réclamation', acad_jury: 'Consulter les relevés conservés',
  stud_list: 'Rechercher ou créer un dossier', stud_status: 'Retrouver une année d’inscription', stud_cards: 'Consulter les pièces des dossiers', stud_accounts: 'Vérifier un compte étudiant',
  fin_kpis: 'Consulter les données financières', fin_contracts: 'Retrouver des frais ou une bourse', fin_payments: 'Retrouver un versement', fin_reports: 'Préparer un export financier',
  staff_records: 'Rechercher ou créer un dossier professionnel', staff_teachers: 'Consulter les affectations', staff_list: 'Gérer un compte du personnel', staff_roles: 'Comprendre un rôle', staff_permissions: 'Comparer les permissions',
  comm_news: 'Lire les actualités conservées', comm_announcements: 'Retrouver une annonce', log_suppliers: 'Gérer les fournisseurs', log_purchases: 'Consulter le parcours des achats', log_assets: 'Gérer les équipements',
  sys_data: 'Examiner les données et les anomalies', sys_logs: 'Rechercher un événement', sys_backups: 'Exporter les événements consultés', sys_support: 'Consulter l’assistance disponible',
};
