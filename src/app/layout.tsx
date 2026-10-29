import type { Metadata } from 'next';
import '../../public/fonts/nunito-sans.css';
import './globals.css';
import PortalProvider from '@/components/providers/PortalProvider';

export const metadata: Metadata = {
  title: { default: 'ESCEN — Gestion universitaire', template: '%s | ESCEN' },
  description: 'Plateforme centralisée de gestion académique, administrative, financière et opérationnelle d\'ESCEN.',
  icons: { icon: '/logo-escen-carre.png', apple: '/logo-escen-carre.png' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body><PortalProvider>{children}</PortalProvider></body>
    </html>
  );
}
