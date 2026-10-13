import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Compass } from 'lucide-react';
import type { RoleName } from '@/types';
import { ROLE_ONBOARDING, type OnboardingStep } from '@/permissions/roleOnboarding';

interface TargetGuidance { title: string; purpose: string; usage: string; }

interface NavigationTab {
  id: string;
  name: string;
  subTabs?: Array<{ id: string; name: string }>;
}

const TARGET_GUIDANCE: Record<string, TargetGuidance> = {
  'role-switcher': { title: 'Sélecteur de rôle', purpose: 'Il simule la connexion avec un rôle ESCEN et adapte immédiatement les menus, actions et données visibles.', usage: 'Choisissez un rôle uniquement pour démontrer son parcours. Dans la future version, le rôle viendra du compte connecté.' },
  dashboard_kpis: { title: 'Statistiques clés', purpose: 'Cet onglet rassemble les indicateurs globaux calculés à partir des données créées dans le prototype.', usage: 'Il sert au pilotage et à la consultation. Il ne donne pas automatiquement le droit de modifier les données sources.' },
  acad_reference: { title: 'Référentiel académique', purpose: 'Cet onglet construit les fondations : années, filières, parcours, niveaux, semestres, matières, groupes, enseignants et affectations.', usage: 'Commencez ici lorsque le système est vide. Les autres processus dépendent de ces références.' },
  acad_grades: { title: 'Évaluations et notes', purpose: 'Cet onglet permet de créer les évaluations, saisir les notes et suivre leur validation jusqu’à la publication.', usage: 'Chaque rôle ne voit que ses actions autorisées : saisie Enseignant, contrôle et publication Direction Académique.' },
  acad_attendance: { title: 'Feuilles de présence', purpose: 'Cet onglet ouvre la liste des étudiants d’une séance et enregistre leur présence, absence, retard ou justification.', usage: 'Une séance et un groupe doivent exister avant la saisie. Le Surveillant ou l’Enseignant reste limité à ses affectations.' },
  acad_schedule: { title: 'Emploi du temps', purpose: 'Cet onglet consulte ou planifie les séances avec salle, groupe, enseignant, date et horaire.', usage: 'La création vérifie les conflits, la disponibilité de la salle, son effectif et les périodes bloquées.' },
  acad_complaints: { title: 'Réclamations', purpose: 'Cet onglet suit les demandes de correction de note depuis le dépôt jusqu’à la décision et la clôture.', usage: 'L’Étudiant suit sa demande, l’Enseignant donne son avis lorsqu’il est sollicité et la Direction Académique décide.' },
  fin_payments: { title: 'Échéanciers et versements', purpose: 'Cet onglet affiche la situation financière et permet au RAF d’enregistrer les paiements et reçus.', usage: 'Un étudiant et un frais doivent exister. L’annulation reste indisponible tant que le rôle habilité n’est pas confirmé.' },
  fin_kpis: { title: 'Indicateurs financiers', purpose: 'Cet onglet calcule attendu, encaissé, reste à recouvrer et situations étudiantes.', usage: 'Les chiffres viennent des frais, échéanciers et paiements créés ; une plateforme vide affiche donc zéro ou aucune donnée.' },
  comm_announcements: { title: 'Créer une annonce', purpose: 'Cet onglet rédige et diffuse une information opérationnelle à une audience déterminée.', usage: 'Vérifiez le contenu et l’audience. Une annonce se distingue d’une actualité institutionnelle durable.' },
  comm_news: { title: 'Actualités ESCEN', purpose: 'Cet onglet présente les publications institutionnelles durables de l’établissement.', usage: 'Il ne contient aucun CRM, prospect ou processus commercial.' },
  staff_list: { title: 'Utilisateurs et rôles', purpose: 'Cet onglet préparera les comptes simulés, leur activation et leurs affectations de rôles.', usage: 'L’Informaticien administre l’accès technique sans obtenir de droits académiques ou financiers.' },
  sys_logs: { title: 'Journal d’activité', purpose: 'Cet onglet trace les actions sensibles réalisées dans le prototype.', usage: 'Il sert au diagnostic et à l’audit : acteur, rôle, action, date et détails doivent rester consultables.' },
  espace: { title: 'Mon Espace', purpose: 'Ce menu ouvre votre espace personnel, construit spécialement pour le rôle actuellement connecté.', usage: 'Vous y retrouvez vos priorités et vos informations utiles. Son contenu diffère selon le rôle.' },
  espace_dashboard: { title: 'Tableau de bord personnel', purpose: 'Cette page résume les tâches, alertes et indicateurs directement utiles à votre rôle.', usage: 'Elle ne présente pas automatiquement les données réservées aux autres fonctions.' },
  espace_announcements: { title: 'Annonces et actualités', purpose: 'Cette page rassemble les communications pertinentes pour votre profil.', usage: 'Consultez-la régulièrement pour suivre les informations opérationnelles et institutionnelles.' },
  dashboard_global: { title: 'Tableau de bord global', purpose: 'Ce menu regroupe la vision consolidée de l’activité ESCEN.', usage: 'Il sert surtout au pilotage. Voir une information ne donne pas automatiquement le droit de la modifier.' },
  dashboard_reports: { title: 'Rapports et activités', purpose: 'Cette page prépare les synthèses transversales et le suivi de l’activité institutionnelle.', usage: 'Les rapports sont calculés depuis les données réellement créées dans le prototype.' },
  academique: { title: 'Académique', purpose: 'Ce menu rassemble le référentiel, le planning, les présences, les évaluations, les notes et les réclamations.', usage: 'Les écrans et actions affichés dépendent strictement des responsabilités académiques de votre rôle.' },
  acad_program: { title: 'Filières et matières', purpose: 'Cette page consulte l’offre académique : filières, parcours et matières contextualisées.', usage: 'Une matière est un référentiel ; son affectation à un enseignant et un groupe constitue un enseignement distinct.' },
  etudiants: { title: 'Étudiants', purpose: 'Ce menu gère les dossiers des étudiants déjà inscrits et leur parcours annuel.', usage: 'Les anciennes années ne doivent jamais être écrasées et l’accès aux dossiers dépend du rôle.' },
  stud_list: { title: 'Liste des étudiants', purpose: 'Cette page recherche et consulte les dossiers des étudiants autorisés dans votre périmètre.', usage: 'Elle sert aussi de point d’entrée vers l’identité, le contact, l’inscription et l’historique académique.' },
  stud_cards: { title: 'Cartes d’étudiant', purpose: 'Cette page prépare l’aperçu des cartes étudiantes à partir des données du dossier.', usage: 'L’impression ou la réédition reste limitée tant que le rôle habilité n’est pas confirmé.' },
  stud_status: { title: 'Réinscriptions et abandons', purpose: 'Cette page suivra les changements de statut étudiant sans supprimer ni écraser l’historique.', usage: 'Les rôles de validation restent à confirmer ; aucune décision automatique n’est inventée.' },
  finance: { title: 'Finance', purpose: 'Ce menu centralise frais, échéanciers, paiements, reçus et rapports financiers institutionnels.', usage: 'Il est réservé aux rôles financiers autorisés. Les étudiants n’accèdent pas à ce module institutionnel.' },
  fin_reports: { title: 'Rapports financiers', purpose: 'Cette page synthétise encaissements, restes, échéances et impayés.', usage: 'Les résultats doivent provenir des opérations présentes en mémoire et non de chiffres décoratifs.' },
  personnel: { title: 'Personnel', purpose: 'Ce menu regroupe les comptes simulés, les rôles et les enseignants.', usage: 'L’administration technique des accès ne confère aucun pouvoir académique ou financier supplémentaire.' },
  staff_teachers: { title: 'Enseignants et affectations', purpose: 'Cette page consulte les enseignants, leurs enseignements et leur charge pédagogique.', usage: 'Une affectation relie une matière, un enseignant, un groupe, un semestre et une année.' },
  marketing: { title: 'Communication', purpose: 'Ce menu gère les annonces opérationnelles et les actualités institutionnelles.', usage: 'Il n’inclut aucun CRM, prospect, candidature ou pipeline commercial.' },
  systeme: { title: 'Système et audit', purpose: 'Ce menu regroupe le diagnostic technique, le journal, le support et les sauvegardes simulées.', usage: 'Il ne permet pas à l’Informaticien de modifier les décisions métier.' },
  sys_backups: { title: 'Sauvegardes simulées', purpose: 'Cette page démontre le suivi d’une sauvegarde sans prétendre créer une vraie copie persistante.', usage: 'Le prototype reste entièrement en mémoire ; la disparition des données au rafraîchissement est normale.' },
  sys_support: { title: 'Tickets de support', purpose: 'Cette page prépare la déclaration et le suivi des incidents ou demandes techniques.', usage: 'Un ticket doit conserver son auteur, sa priorité, son responsable, son statut et son historique.' },
};

interface RoleOnboardingProps {
  role: RoleName;
  open: boolean;
  onComplete: () => void;
  onNavigate: (tab: string, subTab?: string) => void;
  availableTabs: NavigationTab[];
}

export default function RoleOnboarding({ role, open, onComplete, onNavigate, availableTabs }: RoleOnboardingProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [targetKey, setTargetKey] = useState('role-switcher');
  const guide = ROLE_ONBOARDING[role];
  const steps = useMemo(() => {
    const introductionSteps = guide.steps.filter(item => !item.target);
    const navigationSteps: OnboardingStep[] = availableTabs.flatMap(tab => {
      const tabGuidance = TARGET_GUIDANCE[tab.id];
      const tabStep: OnboardingStep = {
        title: `Menu « ${tab.name} »`,
        description: tabGuidance?.purpose ?? `Ce menu donne accès à ${tab.name}.`,
        actions: [tabGuidance?.usage ?? 'Ouvrez ce menu pour consulter les pages autorisées.'],
        target: { tab: tab.id, label: tab.name },
      };
      const subTabSteps = (tab.subTabs ?? []).map(subTab => {
        const guidance = TARGET_GUIDANCE[subTab.id];
        return {
          title: subTab.name,
          description: guidance?.purpose ?? `Cette page présente ${subTab.name}.`,
          actions: [guidance?.usage ?? 'Utilisez cette page dans les limites de votre rôle.'],
          target: { tab: tab.id, subTab: subTab.id, label: subTab.name },
        };
      });
      return [tabStep, ...subTabSteps];
    });
    return [...introductionSteps, ...navigationSteps];
  }, [availableTabs, guide.steps]);
  const step = steps[stepIndex] ?? steps[0];
  useEffect(() => {
    setStepIndex(0);
  }, [role, open]);
  useEffect(() => {
    if (!open) return;
    if (step.target) onNavigate(step.target.tab, step.target.subTab);
    const selector = step.target?.subTab
      ? `[data-tour-subtab="${step.target.subTab}"]`
      : step.target
        ? `[data-tour-tab="${step.target.tab}"]`
        : '[data-tour="role-switcher"]';
    const guidanceKey = step.target?.subTab ?? step.target?.tab ?? 'role-switcher';
    const timer = window.setTimeout(() => {
      document.querySelectorAll('.onboarding-highlight').forEach(element => element.classList.remove('onboarding-highlight'));
      const element = document.querySelector(selector);
      element?.classList.add('onboarding-highlight');
      element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTargetKey(guidanceKey);
    }, 120);
    return () => {
      window.clearTimeout(timer);
      document.querySelectorAll('.onboarding-highlight').forEach(element => element.classList.remove('onboarding-highlight'));
    };
  }, [open, onNavigate, step]);
  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') onComplete(); };
    document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, [open, onComplete]);
  if (!open) return null;
  const isLast = stepIndex === steps.length - 1;
  const targetGuidance = TARGET_GUIDANCE[targetKey] ?? { title: step.title, purpose: step.description, usage: 'Suivez les actions indiquées dans le guide.' };
  return <><aside className="onboarding-coachmark" role="dialog" aria-labelledby="onboarding-title">
      <div className="onboarding-progress"><button className="guide-dismiss" type="button" onClick={onComplete}>Fermer le guide</button><span>Guide du rôle · {role}</span><span>{stepIndex + 1}/{steps.length}</span></div>
      <div className="onboarding-progress-track"><span style={{ width: `${((stepIndex + 1) / steps.length) * 100}%` }} /></div>
      {stepIndex === 0 && <div className="onboarding-welcome"><div className="onboarding-icon"><Compass size={24} /></div><div><h2>{guide.welcome}</h2><p>{guide.mission}</p></div></div>}
      <div className="onboarding-content">
        <span className="pill pill-info">Étape {stepIndex + 1}</span>
        <h3 id="onboarding-title">{step.title}</h3>
        <p>{step.description}</p>
        <div className="onboarding-explainer"><strong>Pourquoi cet élément est montré</strong><span>{targetGuidance.purpose}</span></div>
        <ul>{step.actions.map(action => <li key={action}><CheckCircle2 size={16} /> <span>{action}</span></li>)}</ul>
        {step.target && <div className="onboarding-target"><span>Onglet actuellement présenté</span><strong>{step.target.label}</strong></div>}
      </div>
      <div className="onboarding-footer">
        <span>Vous pouvez reprendre le guide avec le bouton d’aide.</span>
        <div className="btn-group"><button className="btn btn-outline" type="button" disabled={stepIndex === 0} onClick={() => setStepIndex(index => index - 1)}>Précédent</button>{isLast ? <button className="btn btn-primary" type="button" onClick={onComplete}>J’ai compris, commencer</button> : <button className="btn btn-primary" type="button" onClick={() => setStepIndex(index => index + 1)}>Suivant</button>}</div>
      </div>
  </aside></>;
}
