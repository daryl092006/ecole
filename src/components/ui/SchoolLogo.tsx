import Image from 'next/image';
export default function SchoolLogo({ className = '', priority = false }: { className?: string; priority?: boolean }) {
  return <Image src="/logo-escen.png" width={3035} height={602} alt="ESCEN — École supérieure de commerce et d’économie numérique" className={`school-logo ${className}`} priority={priority} unoptimized />;
}
