export interface JourneyStage { title: string; description: string; sections: string[]; }
export const MODULE_JOURNEYS: Record<string, JourneyStage[]> = {
  academique: [
    { title: 'Préparer l’année', description: 'Créer l’année et préparer ses filières, niveaux, groupes, tarifs et moyens d’encaissement avant son ouverture.', sections: ['acad_reference', 'acad_settings'] },
    { title: 'Organiser les enseignements', description: 'Définir les programmes de cours et les matières, puis retrouver les séances et les présences.', sections: ['acad_program', 'acad_schedule', 'acad_attendance'] },
    { title: 'Évaluer les étudiants', description: 'Composer un sujet préparatoire, puis consulter les épreuves et leurs copies.', sections: ['acad_subjects', 'acad_assessments', 'acad_exams', 'acad_resits'] },
    { title: 'Suivre les résultats', description: 'Retrouver les notes, les réclamations et les relevés, avec leurs états disponibles.', sections: ['acad_grades', 'acad_complaints', 'acad_jury'] },
  ],
  etudiants: [
    { title: 'Inscrire et suivre', description: 'Commencer par l’identité de l’étudiant ; vérifier son parcours et ses pièces avant une opération.', sections: ['stud_list', 'stud_status', 'stud_cards'] },
    { title: 'Accès étudiants', description: 'Le dossier de scolarité et le compte de connexion ont des fonctions distinctes.', sections: ['stud_accounts'] },
  ],
  finance: [
    { title: 'Consulter les contrats', description: 'Retrouver les contrats individuels et les bourses. Les tarifs se configurent dans la préparation annuelle.', sections: ['fin_contracts'] },
    { title: 'Contrôler les versements', description: 'Consulter les transactions et les échéances avec leurs références enregistrées.', sections: ['fin_payments', 'fin_kpis'] },
    { title: 'Contrôler et exporter', description: 'Choisir les données et le périmètre avant de télécharger un export.', sections: ['fin_reports'] },
  ],
  personnel: [
    { title: 'Tenir les dossiers professionnels', description: 'Créer ou compléter une identité et retrouver ses contrats et ses affectations.', sections: ['staff_records', 'staff_teachers'] },
    { title: 'Gérer les accès', description: 'Vérifier les permissions du rôle avant de l’attribuer à un compte.', sections: ['staff_roles', 'staff_permissions', 'staff_list'] },
  ],
  marketing: [
    { title: 'Gérer les annonces', description: 'Préparer un brouillon, confirmer ses destinataires et publier ou retirer une annonce.', sections: ['comm_announcements'] },
  ],
  website: [{ title: 'Gérer le site web', description: 'Configurer les pièces et suivre les demandes, articles et brochures.', sections: ['web_applications', 'web_documents', 'web_brochures', 'comm_news'] }],
  logistique: [
    { title: 'Référencer les fournisseurs', description: 'Renseigner les coordonnées pour identifier les interlocuteurs de l’établissement.', sections: ['log_suppliers'] },
    { title: 'Suivre les achats', description: 'Enregistrer une demande détaillée, sa décision et les livraisons reçues.', sections: ['log_purchases'] },
    { title: 'Tenir l’inventaire', description: 'Identifier chaque équipement, sa localisation et son état.', sections: ['log_assets'] },
  ],
  systeme: [
    { title: 'Contrôler les données', description: 'Examiner les dossiers et les anomalies sans modifier les sources originales.', sections: ['sys_data'] },
    { title: 'Tracer et exporter', description: 'Retrouver les événements, suivre les mails et choisir les lignes à exporter.', sections: ['sys_logs', 'sys_emails', 'sys_backups'] },
    { title: 'Assistance', description: 'Prendre en charge les demandes, répondre et conserver les comptes rendus de résolution.', sections: ['sys_support'] },
  ],
};

export const SECTION_TASKS: Record<string, string> = {
  acad_program: 'Organiser les programmes de cours et les matières', acad_reference: 'Préparer et gérer l’année scolaire', acad_settings: 'Consulter les règles à confirmer',
  acad_schedule: 'Retrouver une séance', acad_attendance: 'Consulter une séance réalisée', acad_subjects: 'Préparer un sujet', acad_assessments: 'Consulter les contrôles continus', acad_exams: 'Consulter les examens et leurs copies', acad_resits: 'Consulter les rattrapages', acad_grades: 'Retrouver une note', acad_complaints: 'Suivre une réclamation', acad_jury: 'Consulter les relevés',
  stud_list: 'Rechercher ou créer un dossier', stud_status: 'Retrouver une année d’inscription', stud_cards: 'Consulter les pièces des dossiers', stud_accounts: 'Vérifier un compte étudiant',
  fin_kpis: 'Consulter les données financières', fin_contracts: 'Retrouver des frais ou une bourse', fin_payments: 'Retrouver un versement', fin_reports: 'Préparer un export financier',
  staff_records: 'Rechercher ou créer un dossier professionnel', staff_teachers: 'Consulter les affectations', staff_list: 'Gérer un compte du personnel', staff_roles: 'Comprendre un rôle', staff_permissions: 'Comparer les permissions',
  comm_news: 'Lire les actualités', comm_announcements: 'Préparer et publier une annonce', log_suppliers: 'Gérer les fournisseurs', log_purchases: 'Demander, approuver et réceptionner un achat', log_assets: 'Gérer les équipements',
  sys_data: 'Examiner les données et les anomalies', sys_logs: 'Rechercher un événement', sys_backups: 'Exporter les événements consultés', sys_support: 'Suivre et traiter les demandes de support',
};
