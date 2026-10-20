'use client';
import DrawerActions from '@/components/ui/DrawerActions';
import IconButton from '@/components/ui/IconButton';
import LoadingState from '@/components/ui/LoadingState';
import { useEffect, useState } from 'react';
import { usePortal } from '@/hooks/usePortal';
import { loadWebsiteData, saveWebsiteData } from '@/services/remoteCampusService';
import type { WebsiteArticle } from '@/types/website';
import WorkPage from '@/components/ui/WorkPage';
import FormFeedback from '@/components/ui/FormFeedback';
import ConnectedDomainWorkspace from '@/components/modules/ConnectedDomainWorkspace';

const emptyArticle = { title: '', slug: '', excerpt: '', content: '', image: '', status: 'BROUILLON' as WebsiteArticle['status'] };
export default function WebsiteArticlesPanel() {
  const state = usePortal(); const role = state.activeRole;
  const canManage = (!state.academicYearContext || !!state.academicYearContext.selectedYearId) && state.perms.permissions.includes('communication.manage') && state.session?.capabilities?.[role]?.globalAccess;
  const [articles, setArticles] = useState<WebsiteArticle[]>([]);
  const [editing, setEditing] = useState<Partial<WebsiteArticle> & typeof emptyArticle | null>(null);
  const [loading, setLoading] = useState(true); const [loadError, setLoadError] = useState(''); const [message, setMessage] = useState('');
  const [reason, setReason] = useState(''); const [confirm, setConfirm] = useState(false);
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false); const [archives, setArchives] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setArticles([]); setEditing(null); setMessage(''); setLoadError('');
    loadWebsiteData<WebsiteArticle[]>('articles', role, controller.signal).then(value => { if (!controller.signal.aborted) setArticles(value); }).catch(error => { if (!controller.signal.aborted) setLoadError(error.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [role, state.academicYearContext?.selectedYearId, revision]);
  async function save() {
    if (!editing) return;
    setBusy(true); setMessage('');
    try {
      const { id, version, title, slug, excerpt, content, image, status } = editing;
      await saveWebsiteData({ action: 'article-save', ...(id ? { id, version } : {}), title, slug, excerpt, content, image, status, reason }, role);
      setEditing(null); setConfirm(false); setRevision(value => value + 1);
      setSuccess(status === 'PUBLIE' ? 'Article enregistré et publié sur le site.' : status === 'RETIRE' ? 'Article retiré du site. Son historique est conservé.' : 'Brouillon de l’article enregistré.');
      state.refreshCampus();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Enregistrement impossible.'); }
    finally { setBusy(false); }
  }
  if (archives) return <><button className="btn btn-outline mb-2" onClick={() => setArchives(false)}>Revenir aux articles du site</button><ConnectedDomainWorkspace section="comm_news" /></>;
  return <section>
    <FormFeedback message={success} error={false} />
    <div className="module-header"><div><h1>Actualités institutionnelles</h1><p>Articles du site web ESCEN</p></div><div className="btn-group"><button className="btn btn-outline" onClick={() => setArchives(true)}>Consulter les archives</button>{canManage && <button className="btn btn-primary" onClick={() => { setSuccess(''); setEditing({ ...emptyArticle }); setReason(''); setConfirm(false); }}>Rédiger un article</button>}</div></div>
    {message && !editing && <p className="auth-error" role="alert">{message}</p>}
    {loadError ? <section className="card" role="alert"><h2>Articles indisponibles</h2><p>{loadError}</p><IconButton className="btn btn-outline" onClick={() => setRevision(value => value + 1)} label="Réessayer" /></section> : loading ? <LoadingState label="Chargement des articles…" variant="cards" /> : <div className="card"><div className="card-header"><h2>Publications du site</h2></div>{articles.length === 0 && <p>Aucun article créé pour le site.</p>}{articles.map(article => <article className="card mb-2" key={article.id}><h3>{article.title}</h3><p>{article.excerpt}</p><p className="cell-sub">{article.status} · Version {article.version} · /blogs/{article.slug}</p>{canManage && <button className="btn btn-outline" onClick={() => { setSuccess(''); setEditing(article); setReason(''); setConfirm(false); }}>Modifier : {article.title}</button>}</article>)}</div>}
    {editing && <WorkPage busy={busy} title={editing.id ? 'Modifier l’article du site' : 'Rédiger un article'} onClose={() => { if (!busy) setEditing(null); }}><form className="card" onSubmit={event => { event.preventDefault(); setConfirm(true); }}>{message && <p role="alert" className="auth-error">{message}</p>}
      <label className="form-group">Titre<input className="input" required minLength={3} maxLength={180} value={editing.title} onChange={event => setEditing({ ...editing, title: event.target.value })} /></label>
      <label className="form-group">Adresse de l’article<input className="input" required pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={180} placeholder="nouvelle-rentree-escen" value={editing.slug} onChange={event => setEditing({ ...editing, slug: event.target.value })} /></label>
      <label className="form-group">Résumé<textarea className="input" required minLength={3} maxLength={500} value={editing.excerpt} onChange={event => setEditing({ ...editing, excerpt: event.target.value })} /></label>
      <label className="form-group">Contenu de l’article<textarea className="input" rows={12} required minLength={3} maxLength={50000} value={editing.content} onChange={event => setEditing({ ...editing, content: event.target.value })} /></label>
      <label className="form-group">Image de couverture — URL HTTPS (facultatif)<input className="input" type="url" pattern="https://.*" value={editing.image} onChange={event => setEditing({ ...editing, image: event.target.value })} /></label>
      <label className="form-group">Diffusion<select aria-label="Diffusion" className="select-input" value={editing.status} onChange={event => setEditing({ ...editing, status: event.target.value as WebsiteArticle['status'] })}><option value="BROUILLON">Brouillon privé</option><option value="PUBLIE">Publié sur le site</option><option value="RETIRE">Retiré du site</option></select></label>
      <label className="form-group">Motif de l’enregistrement<textarea className="input" required minLength={3} maxLength={1000} value={reason} onChange={event => { setReason(event.target.value); setConfirm(false); }} /></label>
      {!confirm && <DrawerActions><button className="btn btn-primary" disabled={busy}>Relire avant enregistrement</button></DrawerActions>}
      {confirm && <div className="card mt-2" role="region" aria-label="Confirmation de l’article"><h2>Aperçu avant enregistrement</h2><h3>{editing.title}</h3><p>{editing.excerpt}</p><div style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{editing.content}</div><p>{editing.status === 'PUBLIE' ? 'Cet article sera visible publiquement sur le site.' : editing.status === 'RETIRE' ? 'Cet article sera retiré du site ; son historique sera conservé.' : 'Ce brouillon restera privé.'}</p><DrawerActions><button type="button" className="btn btn-primary" disabled={busy} onClick={() => void save()}>{busy ? 'Enregistrement…' : 'Confirmer l’enregistrement'}</button><button type="button" className="btn btn-outline" disabled={busy} onClick={() => setConfirm(false)}>Reprendre la rédaction</button></DrawerActions></div>}
    </form></WorkPage>}
  </section>;
}
