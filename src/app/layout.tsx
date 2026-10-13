import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ESCEN – Portail Intégré de Gestion Académique',
  description: 'Plateforme centralisée de gestion académique, administrative, financière et opérationnelle d\'ESCEN.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
