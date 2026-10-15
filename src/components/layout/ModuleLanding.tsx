'use client';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { usePortal } from '@/hooks/usePortal';
import { MODULE_JOURNEYS, SECTION_TASKS } from '@/data/moduleJourneys';
export default function ModuleLanding({ tab }: { tab: string }) {
  const state = usePortal();
  const moduleTab = state.availableTabs.find(item => item.id === tab);
  return <section className="module-overview"><div className="page-intro"><div><span className="page-eyebrow">{moduleTab?.name}</span><h1>{moduleTab?.name || 'Module indisponible'}</h1><p>Choisissez votre activité. Les étapes sont regroupées dans leur ordre d’utilisation.</p></div></div><div className="journey-stages">{(MODULE_JOURNEYS[tab] || []).map((stage, index) => {
    const pages = stage.sections.flatMap(id => moduleTab?.subTabs?.filter(page => page.id === id) || []);
    return pages.length ? <section className="journey-stage" key={stage.title}><div className="journey-stage-heading"><span>{index + 1}</span><div><h2>{stage.title}</h2><p>{stage.description}</p></div></div><div className="journey-actions">{pages.map(page => <Link key={page.id} href={page.href}><strong>{SECTION_TASKS[page.id] || page.name}</strong><span>{page.name}<ArrowUpRight size={16} /></span></Link>)}</div></section> : null;
  })}</div></section>;
}
