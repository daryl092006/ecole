'use client';
import Link from 'next/link';
export default function PortalError({ reset }: { reset: () => void }) {
  return <section className="card route-denied"><h1>La page n’a pas pu s’ouvrir</h1><p>Réessayez ou revenez à votre espace.</p><div className="btn-group"><button className="btn btn-primary" onClick={reset}>Réessayer</button><Link className="btn btn-outline" href="/mon-espace">Mon espace</Link></div></section>;
}
