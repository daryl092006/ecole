import type { ReactNode } from 'react';
import Link from 'next/link';
import SchoolLogo from '@/components/ui/SchoolLogo';
export default function AuthShell({ children }: { children: ReactNode }) {
  return <main className="auth-layout"><section className="auth-brand-panel" aria-label="Présentation du portail"><Link href="/connexion" className="auth-brand-link"><SchoolLogo priority /></Link><div className="auth-brand-copy"><span className="auth-eyebrow">PORTAIL DE GESTION</span><h1>Bienvenue<br />à l’ESCEN.</h1><p>Un espace pour suivre la vie académique, la scolarité et les activités de l’établissement.</p><div className="auth-domains"><span>Étudiants et enseignements</span><span>Scolarité et administration</span><span>Direction et services</span></div></div><div className="auth-brand-footer"><span>Lomé, Togo</span><span>École supérieure de commerce et d’économie numérique</span></div></section><section className="auth-form-panel">{children}<footer className="auth-form-footer">ESCEN · Gestion universitaire</footer></section></main>;
}
