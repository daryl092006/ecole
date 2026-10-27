import CandidatePortal from '@/components/modules/website/CandidatePortal';
export const metadata = { title: 'Mon espace candidat', referrer: 'no-referrer' as const, robots: { index: false, follow: false } };
export default function Page() { return <CandidatePortal tracking />; }
