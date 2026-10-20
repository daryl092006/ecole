'use client';
import Link from 'next/link';
import ErrorState from '@/components/ui/ErrorState';
export default function PortalError({ reset }: { reset: () => void }) {
  return <ErrorState title="La page n’a pas pu s’ouvrir" message="Réessayez ou revenez à votre espace." onRetry={reset}><Link className="btn btn-outline" href="/mon-espace">Mon espace</Link></ErrorState>;
}
