'use client';
import PageHeader from '@/components/ui/PageHeader';
import { FileText, Pencil, Plus, Archive, ImagePlus, Trash2, Eye } from 'lucide-react';
import DrawerActions from '@/components/ui/DrawerActions';
import IconButton from '@/components/ui/IconButton';
import LoadingState from '@/components/ui/LoadingState';
import { useEffect, useMemo, useRef, useState } from 'react';
import { usePortal } from '@/hooks/usePortal';
import { loadWebsiteData, saveWebsiteData } from '@/services/remoteCampusService';
import { slugifyWebsiteText } from '@/services/websiteService';
import type { WebsiteArticle } from '@/types/website';
import WorkPage from '@/components/ui/WorkPage';
import ArticleEditor from '@/components/ui/ArticleEditor';
import ReviewedForm from '@/components/ui/ReviewedForm';
import { articlePlainText, extractArticleImages, readAndOptimizeArticleImage, renderArticleContent } from '@/utils/articleDocument';
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
  const [coverUploading, setCoverUploading] = useState(false);
  const [fullPreview, setFullPreview] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true); const [loadError, setLoadError] = useState(''); const [message, setMessage] = useState('');
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

  async function handleCoverUpload(file: File | undefined) {
    if (!file || !editing) return;
    setCoverUploading(true);
    setMessage('');
    try {
      const dataUrl = await readAndOptimizeArticleImage(file);
      setEditing(prev => (prev ? { ...prev, image: dataUrl } : prev));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Impossible d’importer la photo de couverture.');
    } finally {
      setCoverUploading(false);
      if (coverInputRef.current) coverInputRef.current.value = '';
    }
  }

  async function save() {
    if (!editing) return;
    setBusy(true); setMessage('');
    try {
      const { id, version, title, slug, excerpt, content, image, status } = editing;
      const finalSlug = slugifyWebsiteText(slug || title) || 'actualite-escen';
      await saveWebsiteData({ action: 'article-save', ...(id ? { id, version } : {}), title, slug: finalSlug, excerpt, content, image, status }, role);
      setEditing(null); setFullPreview(false); setRevision(value => value + 1);
      setSuccess(status === 'PUBLIE' ? 'Article enregistré et publié sur le site.' : status === 'RETIRE' ? 'Article retiré du site. Son historique est conservé.' : 'Brouillon de l’article enregistré.');
      state.refreshCampus();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Enregistrement impossible.'); }
    finally { setBusy(false); }
  }

  if (archives) return <><button className="btn btn-outline mb-2" onClick={() => setArchives(false)}>Revenir aux articles du site</button><ConnectedDomainWorkspace section="comm_news" /></>;


  return <section className="articles-workspace">
    <FormFeedback message={success} error={false} />
    <PageHeader
      eyebrow="COMMUNICATION & SITE WEB"
      title="Articles du site"
      description="Préparez vos actualités, intégrez vos photos de couverture et de contenu, et gérez leur publication sur le site ESCEN."
    >
      <button className="btn btn-outline" onClick={() => setArchives(true)}><Archive size={16} aria-hidden="true" />Consulter les archives</button>
      {canManage && <button className="btn btn-primary" aria-label="+ Rédiger un article" onClick={() => { setSuccess(''); setEditorError(''); setFullPreview(false); setEditing({ ...emptyArticle }); setSlugTouched(false); }}><Plus size={17} aria-hidden="true" />Rédiger un article</button>}
    </PageHeader>

    <div className="articles-library">
    <div className="editorial-toolbar">
      <div className="editorial-filter-pills" role="group" aria-label="Filtrer par statut de publication">
        <button type="button" aria-pressed={statusFilter === 'ALL'} className={`btn ${statusFilter === 'ALL' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setStatusFilter('ALL')}>Tous ({counts.total})</button>
        <button type="button" aria-pressed={statusFilter === 'PUBLIE'} className={`btn ${statusFilter === 'PUBLIE' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setStatusFilter('PUBLIE')}>Publiés ({counts.published})</button>
        <button type="button" aria-pressed={statusFilter === 'BROUILLON'} className={`btn ${statusFilter === 'BROUILLON' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setStatusFilter('BROUILLON')}>Brouillons ({counts.drafts})</button>
        <button type="button" aria-pressed={statusFilter === 'RETIRE'} className={`btn ${statusFilter === 'RETIRE' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setStatusFilter('RETIRE')}>Retirés ({counts.retired})</button>
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
      <div className="articles-results">
        <div className="card-header">
          <h2>Publications du site</h2>
          <span className="cell-sub">{filteredArticles.length} {filteredArticles.length > 1 ? 'articles affichés' : 'article affiché'}</span>
        </div>
        {filteredArticles.length === 0 ? (
          <div className="articles-empty"><FileText size={30} aria-hidden="true" /><h3>{articles.length === 0 ? 'Votre prochain article commence ici' : 'Aucun résultat'}</h3><p>{articles.length === 0 ? 'Utilisez « Rédiger un article » pour préparer votre première publication.' : 'Essayez un autre mot-clé ou un autre statut.'}</p></div>
        ) : (
          <div className="editorial-articles-grid">
            {filteredArticles.map(article => {
              const stats = estimateReadingStats(article.content || '');
              const inlinePhotoCount = extractArticleImages(article.content || '').length;
              return (
                <article className="editorial-article-card" key={article.id}>
                  <div className="article-row-icon" aria-hidden="true">
                    {article.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img className="article-row-thumb" src={article.image} alt="" />
                    ) : (
                      <FileText size={24} />
                    )}
                  </div>
                  <div className="article-row-body">
                    <div className="editorial-article-meta">
                      <span className={`pill ${article.status === 'PUBLIE' ? 'pill-success' : article.status === 'BROUILLON' ? 'pill-warning' : 'pill-default'}`}>
                        {statusLabels[article.status]}
                      </span>
                      <span>{stats.minutes} min de lecture</span>
                      {(article.image || inlinePhotoCount > 0) && (
                        <span>{(article.image ? 1 : 0) + inlinePhotoCount} {((article.image ? 1 : 0) + inlinePhotoCount) > 1 ? 'photos' : 'photo'}</span>
                      )}
                    </div>
                    <h3>{article.title}</h3>
                    <p>{article.excerpt}</p>
                    <p className="article-row-address">Version {article.version} · /blogs/{article.slug}</p>
                  </div>
                  <div className="article-row-actions">
                    {canManage && (
                      <button className="btn btn-outline" aria-label={`Modifier : ${article.title}`} onClick={() => { setSuccess(''); setEditorError(''); setFullPreview(false); setEditing(article); setSlugTouched(true); }}>
                        <Pencil size={15} aria-hidden="true" />Modifier
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

    </div>

    {editing && <WorkPage busy={busy} title={editing.id ? 'Modifier l’article du site' : 'Rédiger un article'} onClose={() => { if (!busy) { setEditing(null); setFullPreview(false); } }}>
      <ReviewedForm className="article-compose-form" busy={busy} error={message} confirmLabel="Confirmer l’enregistrement" fields={[
        { label: 'Titre', value: editing.title, previous: articles.find(article => article.id === editing.id)?.title },
        { label: 'Adresse', value: `/blogs/${editing.slug}` },
        { label: 'Résumé', value: editing.excerpt },
        { label: 'Contenu', value: articlePlainText(editing.content) },
        { label: 'Image de couverture', value: editing.image.startsWith('data:image/') ? 'Photo importée depuis l’appareil' : editing.image },
        { label: 'Diffusion', value: statusLabels[editing.status], previous: editing.id ? statusLabels[articles.find(article => article.id === editing.id)?.status || 'BROUILLON'] : undefined },
      ]} consequence={editing.status === 'PUBLIE' ? 'Cet article sera visible publiquement sur le site.' : editing.status === 'RETIRE' ? 'Cet article sera retiré du site ; son historique sera conservé.' : 'Ce brouillon restera privé.'}
        validate={() => editorError || (articlePlainText(editing.content).trim().length < 3 ? 'Rédigez au moins trois caractères de contenu.' : articlePlainText(editing.content).length > 50000 ? 'Le contenu dépasse la limite de 50 000 caractères.' : null)}
        onConfirm={() => void save()}>
        {message && <p role="alert" className="auth-error">{message}</p>}
        <div className="article-compose-layout"><div className="article-compose-main">
        <div className="article-compose-heading-row">
          <div className="article-compose-heading"><span className="page-eyebrow">RÉDACTION</span><h3>Votre article</h3><p>Un titre clair, un résumé, vos photos et votre contenu mis en forme.</p></div>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => setFullPreview(v => !v)}>
            <Eye size={15} aria-hidden="true" />{fullPreview ? 'Revenir à l’éditeur' : 'Aperçu complet sur le site'}
          </button>
        </div>
        <div hidden={fullPreview}>
          <label className="form-group">Titre<input className="input" required minLength={3} maxLength={180} placeholder="Ex : Rentrée académique 2026-2027 à l’ESCEN" value={editing.title} onChange={event => {
            const nextTitle = event.target.value;
            setEditing({
              ...editing,
              title: nextTitle,
              slug: (!editing.id && !slugTouched) ? slugifyWebsiteText(nextTitle) : editing.slug,
            });
          }} /></label>
          <label className="form-group">Résumé<textarea className="input" rows={3} required minLength={3} maxLength={500} placeholder="Chapeau introductif affiché sur la liste des actualités (1 à 2 phrases)…" value={editing.excerpt} onChange={event => setEditing({ ...editing, excerpt: event.target.value })} /></label>

          <div
            className="article-main-cover-box"
            onDragOver={event => event.preventDefault()}
            onDrop={event => {
              event.preventDefault();
              const file = Array.from(event.dataTransfer?.files || []).find(f => f.type.startsWith('image/'));
              if (file) void handleCoverUpload(file);
            }}
          >
            <div className="article-main-cover-header">
              <div>
                <strong>Photo de couverture de l’article</strong>
                <span>Affichée en en-tête de l’article et sur la liste des actualités du site public.</span>
              </div>
              <div className="btn-group">
                <button type="button" className="btn btn-outline btn-sm" disabled={busy || coverUploading} onClick={() => coverInputRef.current?.click()}>
                  <ImagePlus size={15} aria-hidden="true" />{coverUploading ? 'Importation…' : editing.image ? 'Changer la couverture' : 'Choisir une photo de couverture'}
                </button>
                {editing.image && (
                  <button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={() => setEditing({ ...editing, image: '' })}>
                    <Trash2 size={14} aria-hidden="true" />Retirer
                  </button>
                )}
              </div>
            </div>
            {editing.image && (
              <div className="article-main-cover-preview">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={editing.image} alt="Couverture de l’article" />
              </div>
            )}
          </div>

          <ArticleEditor
            value={editing.content}
            disabled={busy}
            onValidityChange={setEditorError}
            onSelectCover={src => setEditing(prev => (prev ? { ...prev, image: prev.image || src } : prev))}
            onChange={content => setEditing(prev => (prev ? { ...prev, content } : prev))}
          />
        </div>

        {fullPreview && (
          <article className="article-full-preview-card" aria-label="Aperçu complet de la publication">
            {editing.image && (
              <div className="article-full-preview-cover">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={editing.image} alt={editing.title || 'Couverture de l’article'} />
              </div>
            )}
            <div className="article-full-preview-body">
              <div className="editorial-article-meta">
                <span className={`pill ${editing.status === 'PUBLIE' ? 'pill-success' : editing.status === 'BROUILLON' ? 'pill-warning' : 'pill-default'}`}>
                  {statusLabels[editing.status]}
                </span>
                <span>{estimateReadingStats(editing.content).minutes} min de lecture</span>
              </div>
              <h2>{editing.title || 'Titre de l’article'}</h2>
              {editing.excerpt && <p className="article-full-preview-excerpt">{editing.excerpt}</p>}
              <div className="article-content" dangerouslySetInnerHTML={{ __html: renderArticleContent(editing.content) }} />
            </div>
          </article>
        )}

        </div><aside className="article-compose-settings" aria-label="Réglages de publication">
          <div className="article-compose-heading"><span className="page-eyebrow">PUBLICATION</span><h3>Réglages de l’article</h3></div>
          <label className="form-group">Diffusion<select aria-label="Diffusion" className="select-input" value={editing.status} onChange={event => setEditing({ ...editing, status: event.target.value as WebsiteArticle['status'] })}><option value="BROUILLON">Brouillon privé</option><option value="PUBLIE">Publié sur le site</option><option value="RETIRE">Retiré du site</option></select><span className="article-field-help">{editing.status === 'PUBLIE' ? 'Visible par tous après confirmation.' : editing.status === 'RETIRE' ? 'Masqué du site, conservé dans le portail.' : 'Visible uniquement dans le portail.'}</span></label>
        <label className="form-group">Adresse de l’article<input className="input" required pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={180} placeholder="nouvelle-rentree-escen" value={editing.slug} onChange={event => {
          setSlugTouched(true);
          setEditing({ ...editing, slug: event.target.value });
        }} /></label>

          <div className="article-cover-uploader">
            <span className="article-cover-label">Photo de couverture</span>
            <input
              ref={coverInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              hidden
              onChange={event => void handleCoverUpload(event.target.files?.[0])}
            />
            {editing.image ? (
              <div className="article-cover-preview">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={editing.image} alt="Aperçu de la couverture" />
                <div className="article-cover-preview-actions">
                  <button type="button" className="btn btn-outline btn-sm" disabled={busy || coverUploading} onClick={() => coverInputRef.current?.click()}>
                    <ImagePlus size={14} aria-hidden="true" />Changer
                  </button>
                  <button type="button" className="btn btn-outline btn-sm" disabled={busy} aria-label="Retirer la photo de couverture" onClick={() => setEditing({ ...editing, image: '' })}>
                    <Trash2 size={14} aria-hidden="true" />Retirer
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" className="btn btn-outline article-cover-pick-btn" disabled={busy || coverUploading} onClick={() => coverInputRef.current?.click()}>
                <ImagePlus size={16} aria-hidden="true" />{coverUploading ? 'Importation…' : 'Importer une photo de couverture'}
              </button>
            )}
          </div>

          <label className="form-group">Image de couverture — URL HTTPS (facultatif)<input className="input" type="url" pattern="https://.*" placeholder="https://..." value={editing.image.startsWith('data:image/') ? '' : editing.image} onChange={event => setEditing({ ...editing, image: event.target.value })} /><span className="article-field-help">Importez une photo JPG, PNG ou WebP ci-dessus, ou indiquez une adresse HTTPS.</span></label>
          <p className="article-publication-note">Vous pourrez vérifier les informations avant de confirmer l’enregistrement.</p>
        </aside></div>

        <DrawerActions><button className="btn btn-primary" disabled={busy}>Relire avant enregistrement</button></DrawerActions>
      </ReviewedForm>
    </WorkPage>}
  </section>;
}
