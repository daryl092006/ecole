'use client';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { usePortal } from '@/hooks/usePortal';
export default function ModuleLanding({ tab }: { tab: string }) {
  const state = usePortal();
  const moduleTab = state.availableTabs.find(item => item.id === tab);
  return <section className="module-overview"><div className="page-intro"><div><span className="page-eyebrow">RUBRIQUES DU MODULE</span><h1>{moduleTab?.name || 'Module indisponible'}</h1><p>Choisissez l’activité à gérer. Les dossiers et les actions sont réunis dans chaque rubrique.</p></div></div><div className="home-destinations">{moduleTab?.subTabs?.map(section => <Link key={section.id} href={section.href}><ArrowUpRight size={18} className="destination-arrow" /><h3>{section.name}</h3><span>Ouvrir la rubrique</span></Link>)}</div></section>;
}
