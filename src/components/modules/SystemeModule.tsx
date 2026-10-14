import ResponsiveTable from '@/components/ui/ResponsiveTable';
import { Database, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import type { SystemLog } from '@/types';

interface SystemeModuleProps {
  currentSubTab: string;
  systemLogs: SystemLog[];
  runBackup: () => void;
}

export default function SystemeModule({ currentSubTab, systemLogs, runBackup }: SystemeModuleProps) {
  const [search, setSearch] = useState('');
  const visibleLogs = systemLogs.filter(log => `${log.user} ${log.action} ${log.details}`.toLocaleLowerCase('fr').includes(search.trim().toLocaleLowerCase('fr')));
  return (
    <div>
      {/* ── SUBTAB: sys_logs (Journal d'Activité / Audit) ── */}
      {currentSubTab === 'sys_logs' && (
        <div>
          <div className="module-header">
            <h1>Journal d&apos;activité</h1>
          </div>

          <div className="card card-full">
            <div className="card-header">
              <h2>Événements ({visibleLogs.length} / {systemLogs.length})</h2>
            </div>
            <label className="form-group">Rechercher un événement<input className="input" type="search" placeholder="Action, auteur ou dossier" value={search} onChange={event => setSearch(event.target.value)} /></label>
            <div className="table-wrap"><ResponsiveTable className="data-table"><thead><tr><th>Date et heure</th><th>Auteur / Rôle</th><th>Action</th><th>Détails</th></tr></thead><tbody>{visibleLogs.map((log, index) => <tr key={index}><td><time dateTime={log.date}>{new Date(log.date).toLocaleString('fr-FR')}</time></td><td>{log.user}</td><td><strong>{log.action}</strong></td><td><details><summary>Voir les valeurs et le motif</summary><pre className="audit-values">{log.details}</pre></details></td></tr>)}{!visibleLogs.length && <tr><td colSpan={4}>{systemLogs.length ? 'Aucun événement ne correspond à la recherche.' : 'Aucune activité enregistrée.'}</td></tr>}</tbody></ResponsiveTable></div>
          </div>
        </div>
      )}

      {/* ── SUBTAB: sys_backups (Sauvegardes BDD) ── */}
      {currentSubTab === 'sys_backups' && (
        <div>
          <div className="module-header">
            <h1>Export du journal technique</h1>
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
