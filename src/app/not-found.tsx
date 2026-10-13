import Link from 'next/link';
import SchoolLogo from '@/components/ui/SchoolLogo';
export default function NotFound() {
  return <main className="not-found-page"><SchoolLogo priority /><span className="not-found-code">404</span><h1>Page introuvable</h1><p>L’adresse demandée ne correspond à aucun écran de l’application.</p><Link className="btn btn-primary" href="/mon-espace">Revenir à mon espace</Link><Link href="/connexion">Aller à la connexion</Link></main>;
}
