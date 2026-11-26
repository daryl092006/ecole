'use client';

import { BookOpen, ExternalLink, KeyRound, Library, ShieldCheck, Sparkles } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import WorkspaceSummary from '@/components/ui/WorkspaceSummary';
import DataPanel from '@/components/ui/DataPanel';

const YOUSCRIBE_CODE_URL = 'https://en.youscribe.com/abo/code';
const YOUSCRIBE_HOME_URL = 'https://www.youscribe.com/';

export default function DigitalLibraryWorkspace() {
  return (
    <div className="domain-workspace workspace-stack">
      <PageHeader
        eyebrow="RESSOURCES DOCUMENTAIRES · ESCEN"
        title="Bibliothèque numérique"
        description="Accédez à la bibliothèque numérique partenaire YouScribe (ouvrages académiques, manuels, presse, publications scientifiques et livres audio)."
      >
        <a
          href={YOUSCRIBE_CODE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primary"
        >
          <KeyRound size={17} aria-hidden="true" />
          Activer mon code d’accès YouScribe
        </a>
        <a
          href={YOUSCRIBE_HOME_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-outline"
        >
          <ExternalLink size={16} aria-hidden="true" />
          Explorer le catalogue YouScribe
        </a>
      </PageHeader>

      <WorkspaceSummary
        label="Ressources de la bibliothèque numérique"
        items={[
          {
            label: 'Catalogue numérique',
            value: '+ 1 000 000',
            description: 'Ouvrages, manuels universitaires, thèses, presse et livres audio',
            icon: <Library size={21} />,
            tone: 'primary',
          },
          {
            label: 'Domaines couverts',
            value: 'Management & Tech',
            description: 'Commerce, finance digitale, IA, gestion de projet, droit et économie',
            icon: <BookOpen size={21} />,
          },
          {
            label: 'Accès étudiant & enseignant',
            value: 'Code d’abonnement',
            description: 'Activation directe sur YouScribe avec votre code fourni par l’ESCEN',
            icon: <ShieldCheck size={21} />,
            tone: 'primary',
          },
        ]}
      />

      <DataPanel
        title="Activation et accès à la bibliothèque YouScribe"
        description="Utilisez votre code d’abonnement ESCEN pour activer ou renouveler votre accès personnel à la bibliothèque numérique."
        meta={<span className="pill pill-info">Partenaire officiel YouScribe</span>}
      >
        <div className="workspace-stack" style={{ padding: '0.25rem 0' }}>
          <section className="card" style={{ background: 'var(--surface-subtle, #f8fafc)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1.25rem' }}>
              <div style={{ flex: '1 1 360px' }}>
                <h2 style={{ fontSize: '1.15rem', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Sparkles size={19} aria-hidden="true" />
                  Portail d’activation par code d’abonnement
                </h2>
                <p className="cell-sub" style={{ fontSize: '0.95rem', lineHeight: 1.6, margin: 0 }}>
                  Rendez-vous sur le portail dédié <strong>YouScribe</strong> pour saisir votre code d’accès étudiant ou enseignant et débloquer la lecture illimitée sur ordinateur, tablette et smartphone.
                </p>
                <p style={{ marginTop: '0.65rem', marginBottom: 0 }}>
                  <code className="dossier-ref-badge">{YOUSCRIBE_CODE_URL}</code>
                </p>
              </div>
              <div className="btn-group">
                <a
                  href={YOUSCRIBE_CODE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary"
                >
                  <KeyRound size={17} aria-hidden="true" />
                  Saisir mon code sur YouScribe
                  <ExternalLink size={15} aria-hidden="true" />
                </a>
              </div>
            </div>
          </section>

          <div className="record-details-grid">
            <div className="card">
              <h3>1. Obtenir votre code d’accès</h3>
              <p className="cell-sub" style={{ lineHeight: 1.6 }}>
                Votre code d’abonnement individuel YouScribe vous est communiqué par l’administration ou le support informatique de l’ESCEN. En cas de besoin, contactez le support via l’onglet <strong>Support technique</strong>.
              </p>
            </div>
            <div className="card">
              <h3>2. Activer votre abonnement</h3>
              <p className="cell-sub" style={{ lineHeight: 1.6 }}>
                Cliquez sur <strong>« Activer mon code d’accès YouScribe »</strong> ci-dessus, renseignez votre code sur la page <code>en.youscribe.com/abo/code</code> puis connectez-vous ou créez votre compte avec votre adresse institutionnelle <code>@escen.university</code>.
              </p>
            </div>
            <div className="card">
              <h3>3. Consulter les ouvrages</h3>
              <p className="cell-sub" style={{ lineHeight: 1.6 }}>
                Une fois votre code activé, vous pouvez rechercher et lire en streaming ou hors-ligne les manuels de référence pour vos cours, mémoires, projets et préparations d’examens.
              </p>
            </div>
          </div>
        </div>
      </DataPanel>
    </div>
  );
}
