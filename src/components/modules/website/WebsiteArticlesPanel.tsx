'use client';
import PageHeader from '@/components/ui/PageHeader';
import Link from 'next/link';
import DrawerActions from '@/components/ui/DrawerActions';
import IconButton from '@/components/ui/IconButton';
import LoadingState from '@/components/ui/LoadingState';
import { useEffect, useMemo, useState } from 'react';
import { usePortal } from '@/hooks/usePortal';
import { loadWebsiteData, saveWebsiteData } from '@/services/remoteCampusService';
import { slugifyWebsiteText } from '@/services/websiteService';
import type { WebsiteArticle } from '@/types/website';
import WorkPage from '@/components/ui/WorkPage';
import ArticleEditor from '@/components/ui/ArticleEditor';
import ReviewedForm from '@/components/ui/ReviewedForm';
import { articlePlainText } from '@/utils/articleDocument';
import FormFeedback from '@/components/ui/FormFeedback';
import ConnectedDomainWorkspace from '@/components/modules/ConnectedDomainWorkspace';

const emptyArticle = { title: '', slug: '', excerpt: '', content: '', image: '', status: 'BROUILLON' as WebsiteArticle['status'] };
const statusLabels: Record<WebsiteArticle['status'], string> = {
  BROUILLON: 'Brouillon privé',
  PUBLIE: 'Publié sur le site',
  RETIRE: 'Retiré du site',
};

function estimateReadingStats(text: string) {
  const plain = articlePlainText(text).trim();
  const words = plain ? plain.split(/\s+/).length : 0;
  const minutes = Math.max(1, Math.ceil(words / 200));
  return { words, minutes };
}

export default function WebsiteArticlesPanel() {
  const state = usePortal(); const role = state.activeRole;
  const canManage = (!state.academicYearContext || !!state.academicYearContext.selectedYearId) && state.perms.permissions.includes('communication.manage') && state.session?.capabilities?.[role]?.globalAccess;
  const [articles, setArticles] = useState<WebsiteArticle[]>([]);
  const [editing, setEditing] = useState<Partial<WebsiteArticle> & typeof emptyArticle | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const [editorError, setEditorError] = useState('');
  const [loading, setLoading] = useState(true); const [loadError, setLoadError] = useState(''); const [message, setMessage] = useState('');
  const [reason, setReason] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false); const [archives, setArchives] = useState(false);
  const [revision, setRevision] = useState(0);
  const [statusFilter, setStatusFilter] = useState<'ALL' | WebsiteArticle['status']>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setArticles([]); setEditing(null); setMessage(''); setLoadError('');
    loadWebsiteData<WebsiteArticle[]>('articles', role, controller.signal).then(value => { if (!controller.signal.aborted) setArticles(value); }).catch(error => { if (!controller.signal.aborted) setLoadError(error.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [role, state.academicYearContext?.selectedYearId, revision]);

  const counts = useMemo(() => ({
    total: articles.length,
    published: articles.filter(a => a.status === 'PUBLIE').length,
    drafts: articles.filter(a => a.status === 'BROUILLON').length,
    retired: articles.filter(a => a.status === 'RETIRE').length,
  }), [articles]);

  const filteredArticles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return articles.filter(article => {
      if (statusFilter !== 'ALL' && article.status !== statusFilter) return false;
      if (!q) return true;
      return (
        article.title.toLowerCase().includes(q) ||
        article.excerpt.toLowerCase().includes(q) ||
        article.slug.toLowerCase().includes(q)
      );
    });
  }, [articles, statusFilter, searchQuery]);

  async function save() {
    if (!editing) return;
    setBusy(true); setMessage('');
    try {
      const { id, version, title, slug, excerpt, content, image, status } = editing;
      const finalSlug = slugifyWebsiteText(slug || title) || 'actualite-escen';
      const finalReason = reason.trim().length >= 3 ? reason.trim() : `${statusLabels[status]} : ${title}`;
      await saveWebsiteData({ action: 'article-save', ...(id ? { id, version } : {}), title, slug: finalSlug, excerpt, content, image, status, reason: finalReason }, role);
      setEditing(null); setRevision(value => value + 1);
      setSuccess(status === 'PUBLIE' ? 'Article enregistré et publié sur le site.' : status === 'RETIRE' ? 'Article retiré du site. Son historique est conservé.' : 'Brouillon de l’article enregistré.');
      state.refreshCampus();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Enregistrement impossible.'); }
    finally { setBusy(false); }
  }

  if (archives) return <><button className="btn btn-outline mb-2" onClick={() => setArchives(false)}>Revenir aux articles du site</button><ConnectedDomainWorkspace section="comm_news" /></>;


  return <section>
    <FormFeedback message={success} error={false} />
    <PageHeader
      eyebrow="COMMUNICATION & SITE WEB"
      title="Espace éditorial & Actualités"
      description="Rédaction, publication et gestion des articles d’actualité diffusés sur le site officiel ESCEN."
    >
      <Link className="btn btn-outline" href="/site-web/brochures">Brochures PDF</Link>
      <button className="btn btn-outline" onClick={() => setArchives(true)}>Consulter les archives</button>
      {canManage && <button className="btn btn-primary" onClick={() => { setSuccess(''); setEditorError(''); setEditing({ ...emptyArticle }); setSlugTouched(false); setReason(''); }}>+ Rédiger un article</button>}
    </PageHeader>

    <div className="editorial-stats-grid" aria-label="Synthèse éditoriale">
      <div className="editorial-stat-card"><span>Total des articles</span><strong>{counts.total}</strong></div>
      <div className="editorial-stat-card"><span>Publiés sur le site</span><strong>{counts.published}</strong></div>
      <div className="editorial-stat-card"><span>Brouillons en cours</span><strong>{counts.drafts}</strong></div>
      <div className="editorial-stat-card"><span>Retirés / Archivés</span><strong>{counts.retired}</strong></div>
    </div>

    <div className="editorial-toolbar">
      <div className="editorial-filter-pills" role="group" aria-label="Filtrer par statut de publication">
        <button type="button" className={`btn ${statusFilter === 'ALL' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setStatusFilter('ALL')}>Tous ({counts.total})</button>
        <button type="button" className={`btn ${statusFilter === 'PUBLIE' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setStatusFilter('PUBLIE')}>Publiés ({counts.published})</button>
        <button type="button" className={`btn ${statusFilter === 'BROUILLON' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setStatusFilter('BROUILLON')}>Brouillons ({counts.drafts})</button>
        <button type="button" className={`btn ${statusFilter === 'RETIRE' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setStatusFilter('RETIRE')}>Retirés ({counts.retired})</button>
      </div>
      <div className="editorial-search-wrap">
        <input className="input" type="search" aria-label="Rechercher un article" placeholder="Rechercher par titre, résumé ou slug…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
      </div>
    </div>

    {message && !editing && <p className="auth-error" role="alert">{message}</p>}
    {loadError ? (
      <section className="card" role="alert"><h2>Articles indisponibles</h2><p>{loadError}</p><IconButton className="btn btn-outline" onClick={() => setRevision(value => value + 1)} label="Réessayer" /></section>
    ) : loading ? (
      <LoadingState label="Chargement des articles…" variant="cards" />
    ) : (
      <div className="card">
        <div className="card-header">
          <h2>Publications du site</h2>
          <span className="cell-sub">{filteredArticles.length} {filteredArticles.length > 1 ? 'articles affichés' : 'article affiché'}</span>
        </div>
        {filteredArticles.length === 0 ? (
          <p>{articles.length === 0 ? 'Aucun article créé pour le site.' : 'Aucun article ne correspond aux filtres sélectionnés.'}</p>
        ) : (
          <div className="editorial-articles-grid">
            {filteredArticles.map(article => {
              const stats = estimateReadingStats(article.content || '');
              return (
                <article className="editorial-article-card publication-card" key={article.id}>
                  <div>
                    <div className="editorial-article-meta">
                      <span className={`pill ${article.status === 'PUBLIE' ? 'pill-success' : article.status === 'BROUILLON' ? 'pill-warning' : 'pill-default'}`}>
                        {statusLabels[article.status]}
                      </span>
                      <span>~{stats.minutes} min de lecture ({stats.words} mots)</span>
                    </div>
                    <h3>{article.title}</h3>
                    <p>{article.excerpt}</p>
                  </div>
                  <div>
                    <p className="cell-sub">{article.status} · Version {article.version} · /blogs/{article.slug}</p>
                    {canManage && (
                      <button className="btn btn-outline" onClick={() => { setSuccess(''); setEditorError(''); setEditing(article); setSlugTouched(true); setReason(''); }}>
                        Modifier : {article.title}
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    )}

    {editing && <WorkPage busy={busy} title={editing.id ? 'Modifier l’article du site' : 'Rédiger un article'} onClose={() => { if (!busy) setEditing(null); }}>
      <ReviewedForm className="card" busy={busy} error={message} confirmLabel="Confirmer l’enregistrement" fields={[
        { label: 'Titre', value: editing.title, previous: articles.find(article => article.id === editing.id)?.title },
        { label: 'Adresse', value: `/blogs/${editing.slug}` },
        { label: 'Résumé', value: editing.excerpt },
        { label: 'Contenu', value: articlePlainText(editing.content) },
        { label: 'Image de couverture', value: editing.image },
        { label: 'Diffusion', value: statusLabels[editing.status], previous: editing.id ? statusLabels[articles.find(article => article.id === editing.id)?.status || 'BROUILLON'] : undefined },
      ]} consequence={editing.status === 'PUBLIE' ? 'Cet article sera visible publiquement sur le site.' : editing.status === 'RETIRE' ? 'Cet article sera retiré du site ; son historique sera conservé.' : 'Ce brouillon restera privé.'}
        validate={() => editorError || (articlePlainText(editing.content).trim().length < 3 ? 'Rédigez au moins trois caractères de contenu.' : editing.content.length > 50000 ? 'Le contenu dépasse la limite de 50 000 caractères.' : null)}
        onConfirm={() => void save()}>
        {message && <p role="alert" className="auth-error">{message}</p>}
        <label className="form-group">Titre<input className="input" required minLength={3} maxLength={180} placeholder="Ex : Rentrée académique 2026-2027 à l’ESCEN" value={editing.title} onChange={event => {
          const nextTitle = event.target.value;
          setEditing({
            ...editing,
            title: nextTitle,
            slug: (!editing.id && !slugTouched) ? slugifyWebsiteText(nextTitle) : editing.slug,
          });
        }} /></label>
        <label className="form-group">Adresse de l’article<input className="input" required pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={180} placeholder="nouvelle-rentree-escen" value={editing.slug} onChange={event => {
          setSlugTouched(true);
          setEditing({ ...editing, slug: event.target.value });
        }} /></label>
        <label className="form-group">Résumé<textarea className="input" rows={3} required minLength={3} maxLength={500} placeholder="Chapeau introductif affiché sur la liste des actualités (1 à 2 phrases)…" value={editing.excerpt} onChange={event => setEditing({ ...editing, excerpt: event.target.value })} /></label>

        <ArticleEditor value={editing.content} disabled={busy} onValidityChange={setEditorError} onChange={content => setEditing({ ...editing, content })} />

        <div className="brochure-fields">
          <label className="form-group">Image de couverture — URL HTTPS (facultatif)<input className="input" type="url" pattern="https://.*" placeholder="https://..." value={editing.image} onChange={event => setEditing({ ...editing, image: event.target.value })} /></label>
          <label className="form-group">Diffusion<select aria-label="Diffusion" className="select-input" value={editing.status} onChange={event => setEditing({ ...editing, status: event.target.value as WebsiteArticle['status'] })}><option value="BROUILLON">Brouillon privé</option><option value="PUBLIE">Publié sur le site</option><option value="RETIRE">Retiré du site</option></select></label>
        </div>

        <label className="form-group">Motif de l’enregistrement<textarea className="input" rows={2} maxLength={1000} placeholder="Facultatif — généré automatiquement si laissé vide (ex. Publication institutionnelle)" value={reason} onChange={event => { setReason(event.target.value); }} /></label>

        <DrawerActions><button className="btn btn-primary" disabled={busy}>Relire avant enregistrement</button></DrawerActions>
      </ReviewedForm>
    </WorkPage>}
  </section>;
}
