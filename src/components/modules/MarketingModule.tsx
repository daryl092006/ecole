import { useState } from 'react';
import WorkPage from '@/components/ui/WorkPage';
import FormFeedback from '@/components/ui/FormFeedback';
import type { Announcement } from '@/types';
import { announcementStatus } from '@/services/communicationService';
import { displayDate } from '@/utils/display';

interface MarketingModuleProps {
  currentSubTab: string;
  announcements: Announcement[];
  addAnnouncement: (title: string, content: string, audience: string, expiresOn?: string) => void;
  withdrawAnnouncement: (id: string, reason: string) => void;
}

export default function MarketingModule({ currentSubTab, announcements, addAnnouncement, withdrawAnnouncement }: MarketingModuleProps) {
  const [composing, setComposing] = useState(false);
  const [feedback, setFeedback] = useState<{ error: boolean; text: string } | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [audience, setAudience] = useState('Tous');
  const [expiresOn, setExpiresOn] = useState('');
  const [withdrawId, setWithdrawId] = useState('');
  const [reason, setReason] = useState('');

  const handleCreateAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    try {
      addAnnouncement(newTitle, newContent, audience, expiresOn);
      setNewTitle('');
      setNewContent('');
      setExpiresOn('');
      setComposing(false);
      setFeedback({ error: false, text: 'Annonce publiée et disponible dans Mon Espace.' });
    } catch (error) {
      setFeedback({ error: true, text: error instanceof Error ? error.message : 'Publication impossible.' });
    }
  };

  return (
    <div>
      {/* ── SUBTAB: comm_announcements (Création Annonce / Alertes) ── */}
      {currentSubTab === 'comm_announcements' && (
        <div>
          <div className="module-header"><h1>Annonces</h1><button className="btn btn-primary" onClick={() => { setComposing(true); setFeedback(null); }}>Créer une annonce</button></div>
          <FormFeedback message={feedback?.text || ''} error={feedback?.error || false} />
          <div>
          {composing && <WorkPage title="Créer une annonce" onClose={() => setComposing(false)}><div className="card">
            <div className="card-header"><h2>Publier une annonce opérationnelle</h2></div>
            <form onSubmit={handleCreateAnnouncement} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="announcement-title">Titre de l'annonce</label>
                <input
                  id="announcement-title"
                  required
                  maxLength={160}
                  type="text"
                  className="input"
                  placeholder="ex: Report du cours de Génie Logiciel"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="announcement-content">Corps du message</label>
                <textarea
                  id="announcement-content"
                  required
                  maxLength={5000}
                  className="input"
                  rows={4}
                  placeholder="Écrivez le contenu de votre annonce ici..."
                  value={newContent}
                  onChange={e => setNewContent(e.target.value)}
                  style={{ resize: 'vertical', fontFamily: 'inherit' }}
                />
              </div>
              <label className="form-group">Destinataires<select className="select-input" value={audience} onChange={event => setAudience(event.target.value)}><option value="Tous">Tous les utilisateurs</option><option value="Étudiants">Étudiants et délégués</option><option value="Enseignants">Enseignants</option><option value="Surveillant">Surveillants</option></select></label>
              <label className="form-group">Date d’expiration (facultative)<input className="input" type="date" min={new Date().toISOString().slice(0, 10)} value={expiresOn} onChange={event => setExpiresOn(event.target.value)} /></label>
              <p className="cell-sub">Visible jusqu’à cette date incluse.</p>
              <button className="btn btn-primary" type="submit">
                Diffuser l'annonce
              </button>
            </form>
            </div></WorkPage>}

          <div className="card">
            <div className="card-header"><h2>Flux des annonces diffusées</h2></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {announcements.length === 0 && <div className="empty-state"><strong>Aucune annonce diffusée</strong><span>Utilisez le formulaire pour créer la première annonce.</span></div>}
              {announcements.map(ann => (
                <div key={ann.id} style={{ padding: '0.75rem', background: 'var(--bg-tertiary)', borderRadius: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                    <span>Auteur : {ann.author}</span>
                    <span>{ann.date}</span>
                  </div>
                  <strong style={{ fontSize: '0.9rem' }}>{ann.title}</strong>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{ann.content}</p>
                  <p className="cell-sub">{ann.audience} · {announcementStatus(ann)}{ann.expiresOn ? ` · Expiration : ${displayDate(ann.expiresOn)}` : ''}</p>
                  {!ann.withdrawnAt && <button className="btn btn-outline btn-sm" aria-label={`Retirer l’annonce « ${ann.title} »`} onClick={() => { setWithdrawId(ann.id); setReason(''); setFeedback(null); }}>Retirer l’annonce</button>}
                  {!!ann.history?.length && <details><summary>Historique de diffusion</summary>{ann.history.map((entry, index) => <p className="cell-sub" key={index}>{new Date(entry.date).toLocaleString('fr-FR')} · {entry.actor} · {entry.role} · {entry.action === 'PUBLICATION' ? 'Publication' : 'Retrait'} · {entry.reason}</p>)}</details>}
                  {withdrawId === ann.id && <WorkPage title={`Retirer l’annonce : ${ann.title}`} onClose={() => setWithdrawId('')}><form className="mt-2" onSubmit={event => {
                    event.preventDefault();
                    try {
                      withdrawAnnouncement(ann.id, reason);
                      setWithdrawId(''); setReason('');
                      setFeedback({ error: false, text: 'Annonce retirée. Son contenu et son historique sont conservés.' });
                    } catch (error) {
                      setFeedback({ error: true, text: error instanceof Error ? error.message : 'Retrait impossible.' });
                    }
                  }}><label className="form-group">Motif du retrait<textarea className="input" required minLength={3} maxLength={1000} value={reason} onChange={event => setReason(event.target.value)} /></label><div className="btn-group"><button className="btn btn-primary" type="submit">Confirmer le retrait</button><button className="btn btn-outline" type="button" onClick={() => setWithdrawId('')}>Annuler</button></div></form></WorkPage>}
                </div>
              ))}
            </div>
          </div>
          </div>
        </div>
      )}

      {/* ── SUBTAB: comm_news (Actualités ESCEN) ── */}
      {currentSubTab === 'comm_news' && (
        <div>
          <div className="module-header">
            <h1>Actualités institutionnelles</h1>
          </div>
          <div className="card card-full">
            <div className="card-header"><h2>Actualités publiées</h2></div>
            <div>{announcements.filter(item => announcementStatus(item) === 'Active').length === 0 && <p>Aucune actualité publiée.</p>}{announcements.filter(item => announcementStatus(item) === 'Active').map(item => <article key={item.id} className="mb-2"><h3>{item.title}</h3><p>{item.content}</p><small>{item.author} · {displayDate(item.date)}</small></article>)}</div>
          </div>
        </div>
      )}
    </div>
  );
}
