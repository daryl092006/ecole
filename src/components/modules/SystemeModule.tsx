import { CheckCircle, Database, RefreshCw } from 'lucide-react';
import type { SystemLog } from '@/types';

interface SystemeModuleProps {
  currentSubTab: string;
  systemLogs: SystemLog[];
  runBackup: () => void;
}

export default function SystemeModule({ currentSubTab, systemLogs, runBackup }: SystemeModuleProps) {
  return (
    <div>
      {/* ── SUBTAB: sys_logs (Journal d'Activité / Audit) ── */}
      {currentSubTab === 'sys_logs' && (
        <div>
          <div className="module-header">
            <h1>Journal d&apos;activité &amp; Audit</h1>
            <p>Traçabilité complète des actions sensibles et modifications de données d'ESCEN.</p>
          </div>

          <div className="card card-full">
            <div className="card-header">
              <h2>Journal d&apos;activité ({systemLogs.length} entrées)</h2>
              <span className="pill pill-success"><CheckCircle size={11} /> Journal Actif</span>
            </div>
            <div className="log-list" style={{ maxHeight: '450px' }}>
              {systemLogs.length === 0 && <div className="empty-state"><strong>Aucune activité enregistrée</strong><span>Les actions réalisées dans le prototype alimenteront ce journal.</span></div>}
              {systemLogs.map((log, i) => (
                <div key={i} className="log-entry">
                  <span className="log-date">[{log.date}]</span>
                  <span className="log-user">{log.user}:</span>
                  <span className="log-action">{log.action}</span>
                  <span className="log-details">({log.details})</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── SUBTAB: sys_backups (Sauvegardes BDD) ── */}
      {currentSubTab === 'sys_backups' && (
        <div>
          <div className="module-header">
            <h1>Export du journal technique</h1>
            <p>Administration technique, historique et contrôle de conservation des données.</p>
          </div>

          <div className="card card-full">
            <div className="card-header">
              <h2>Instantané local du journal</h2>
              <Database size={16} style={{ color: 'var(--text-muted)' }} />
            </div>
            <div style={{ fontSize: '0.875rem' }}>
              <div className="empty-state"><strong>Export JSON disponible</strong><span>Téléchargez le journal du prototype en JSON. Cet export ne restaure aucune donnée.</span></div>
              <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem' }}>
                <button className="btn btn-primary" onClick={runBackup}>
                  <RefreshCw size={14} /> Télécharger le journal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── SUBTAB: sys_support (Tickets de Support) ── */}
      {currentSubTab === 'sys_support' && (
        <div>
          <div className="module-header">
            <h1>Centre de support technique</h1>
            <p>Suivi et résolution des anomalies et demandes techniques des utilisateurs d'ESCEN.</p>
          </div>

          <div className="card card-full">
            <div className="card-header"><h2>Tickets ouverts</h2></div>
            <div className="empty-state"><strong>Aucun ticket de support</strong><span>Les tickets créés apparaîtront ici.</span></div>
          </div>
        </div>
      )}
    </div>
  );
}
