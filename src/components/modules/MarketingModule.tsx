import { useState } from 'react';
import type { Announcement } from '@/types';

interface MarketingModuleProps {
  currentSubTab: string;
  announcements: Announcement[];
  addAnnouncement: (title: string, content: string, audience: string) => void;
}

export default function MarketingModule({ currentSubTab, announcements, addAnnouncement }: MarketingModuleProps) {
  const [feedback, setFeedback] = useState<{ error: boolean; text: string } | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');

  const handleCreateAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    try {
      addAnnouncement(newTitle, newContent, 'Tous');
      setNewTitle('');
      setNewContent('');
      setFeedback({ error: false, text: 'Annonce publiée et disponible dans Mon Espace.' });
    } catch (error) {
      setFeedback({ error: true, text: error instanceof Error ? error.message : 'Publication impossible.' });
    }
  };

  return (
    <div>
      {/* ── SUBTAB: comm_announcements (Création Annonce / Alertes) ── */}
      {currentSubTab === 'comm_announcements' && (
        <div className="content-grid">
          <div className="card">
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
              <button className="btn btn-primary" type="submit">
                Diffuser l'annonce
              </button>
            </form>
            {feedback && <div className={feedback.error ? 'field-error mt-2' : 'info-box mt-2'} role={feedback.error ? 'alert' : 'status'}>{feedback.text}</div>}
          </div>

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
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── SUBTAB: comm_news (Actualités ESCEN) ── */}
      {currentSubTab === 'comm_news' && (
        <div>
          <div className="module-header">
            <h1>Actualités institutionnelles</h1>
            <p>Gestion des actualités de l'établissement ESCEN.</p>
          </div>
          <div className="card card-full">
            <div className="card-header"><h2>Actualités publiées</h2></div>
            <div>{announcements.length === 0 && <p>Aucune actualité publiée.</p>}{announcements.map(item => <article key={item.id} className="mb-2"><h3>{item.title}</h3><p>{item.content}</p><small>{item.author} · {item.date}</small></article>)}</div>
          </div>
        </div>
      )}
    </div>
  );
}
