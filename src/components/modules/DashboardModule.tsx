import type { Student } from '@/types';

interface DashboardModuleProps {
  currentSubTab: string;
  students: Student[];
}

export default function DashboardModule({ currentSubTab, students }: DashboardModuleProps) {
  const expected = students.reduce((total, student) => total + student.financials.expected, 0);
  const paid = students.reduce((total, student) => total + student.financials.paid, 0);
  const levels = ['Licence 1', 'Licence 2', 'Licence 3', 'Master 1', 'Master 2'];
  const studentsByLevel = levels.map(level => ({ level, count: students.filter(student => student.niveau === level).length }));
  return (
    <div>
      {/* ── SUBTAB: dashboard_kpis (Statistiques Clés) ── */}
      {currentSubTab === 'dashboard_kpis' && (
        <div>
          <div className="module-header">
            <h1>Tableau de Pilotage Global</h1>
            <p>Indicateurs globaux sur les {students.length} dossiers autorisés. Le recouvrement correspond au montant encaissé / montant de scolarité attendu ; les frais d’inscription sont exclus.</p>
          </div>

          <div className="metrics-grid">
            {[
              { icon: '🎓', label: 'Dossiers étudiants', value: students.length, color: '#3b82f6', bg: 'var(--accent-light)' },
              { icon: '💰', label: 'Taux de recouvrement', value: expected ? (100 * paid / expected).toFixed(1) + '%' : '—', color: '#f59e0b', bg: 'var(--warning-light)' },
              { icon: '✅', label: 'Taux de réussite', value: '—', color: '#10b981', bg: 'var(--success-light)' },
              { icon: '🚨', label: 'Abandons', value: students.filter(student => student.status === 'Abandon').length, color: '#ef4444', bg: 'var(--danger-light)' },
            ].map((m, i) => (
              <div key={i} className="metric-card">
                <div className="metric-icon-wrap" style={{ background: m.bg }}>
                  <span>{m.icon}</span>
                </div>
                <div>
                  <div className="metric-value" style={{ color: m.color }}>{m.value}</div>
                  <div className="metric-label">{m.label}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="card">
            <div className="card-header"><h2>Répartition des effectifs par niveau</h2></div>
            {students.length === 0 ? <div className="empty-state"><strong>Aucun effectif</strong><span>Créez les étudiants pour alimenter cet indicateur.</span></div> : <div className="catalog-list">{studentsByLevel.map(item => <div className="catalog-item" key={item.level}><span>{item.level}</span><strong>{item.count}</strong></div>)}</div>}
          </div>
        </div>
      )}

      {/* ── SUBTAB: dashboard_reports (Rapports & Activités) ── */}
      {currentSubTab === 'dashboard_reports' && (
        <div>
          <div className="module-header">
            <h1>Rapports opérationnels</h1>
            <p>Rapports d'activité consolidés pour la Direction Générale d'ESCEN.</p>
          </div>

          <div className="card">
            <div className="card-header"><h2>Derniers rapports de pilotage</h2></div>
            <div className="empty-state"><strong>Aucun rapport généré</strong><span>Les rapports seront calculés à partir des données créées dans le prototype.</span></div>
          </div>
        </div>
      )}
    </div>
  );
}
