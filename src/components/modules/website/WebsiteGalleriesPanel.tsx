'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Eye,
  ImagePlus,
  Images,
  MapPin,
  Pencil,
  Plus,
  Sparkles,
  Tag,
  Trash2,
  Upload,
} from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import DrawerActions from '@/components/ui/DrawerActions';
import IconButton from '@/components/ui/IconButton';
import LoadingState from '@/components/ui/LoadingState';
import WorkPage from '@/components/ui/WorkPage';
import DetailDrawer from '@/components/ui/DetailDrawer';
import ReviewedForm from '@/components/ui/ReviewedForm';
import FormFeedback from '@/components/ui/FormFeedback';
import { usePortal } from '@/hooks/usePortal';
import { loadWebsiteData, saveWebsiteData } from '@/services/remoteCampusService';
import { GALLERY_CATEGORIES, slugifyWebsiteText } from '@/services/websiteService';
import type { WebsiteGallery, WebsiteGalleryPhoto } from '@/types/website';
import { isSafeArticleImageUrl, readAndOptimizeArticleImage } from '@/utils/articleDocument';

const emptyGallery = {
  title: '',
  slug: '',
  subtitle: '',
  category: 'Vie étudiante',
  location: 'Campus principal',
  cover: '',
  photos: [] as WebsiteGalleryPhoto[],
  status: 'BROUILLON' as WebsiteGallery['status'],
};

const statusLabels: Record<WebsiteGallery['status'], string> = {
  BROUILLON: 'Brouillon privé',
  PUBLIE: 'Publié sur le site',
  RETIRE: 'Retiré du site',
};

function makePhotoId(): string {
  return `photo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function suggestCaptionFromFilename(filename: string): string {
  const base = filename.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim();
  if (!base) return '';
  return base.charAt(0).toUpperCase() + base.slice(1);
}

export default function WebsiteGalleriesPanel() {
  const state = usePortal();
  const role = state.activeRole;
  const canManage =
    (!state.academicYearContext || !!state.academicYearContext.selectedYearId) &&
    state.perms.permissions.includes('communication.manage') &&
    state.session?.capabilities?.[role]?.globalAccess;

  const [galleries, setGalleries] = useState<WebsiteGallery[]>([]);
  const [editing, setEditing] = useState<(Partial<WebsiteGallery> & typeof emptyGallery) | null>(null);
  const [viewingAlbum, setViewingAlbum] = useState<WebsiteGallery | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [slugTouched, setSlugTouched] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const [photosUploading, setPhotosUploading] = useState(false);
  const [externalPhotoUrl, setExternalPhotoUrl] = useState('');
  const [externalPhotoCaption, setExternalPhotoCaption] = useState('');
  const coverInputRef = useRef<HTMLInputElement>(null);
  const photosInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const [statusFilter, setStatusFilter] = useState<'ALL' | WebsiteGallery['status']>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setGalleries([]);
    setEditing(null);
    setMessage('');
    setLoadError('');
    loadWebsiteData<WebsiteGallery[]>('galleries', role, controller.signal)
      .then(value => {
        if (!controller.signal.aborted) {
          setGalleries(
            (value || []).map(item => ({
              ...item,
              photos: Array.isArray(item.photos) ? item.photos : [],
            }))
          );
        }
      })
      .catch(error => {
        if (!controller.signal.aborted) setLoadError(error.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [role, state.academicYearContext?.selectedYearId, revision]);

  const counts = useMemo(
    () => ({
      total: galleries.length,
      published: galleries.filter(g => g.status === 'PUBLIE').length,
      drafts: galleries.filter(g => g.status === 'BROUILLON').length,
      retired: galleries.filter(g => g.status === 'RETIRE').length,
      photos: galleries.reduce((sum, g) => sum + (Array.isArray(g.photos) ? g.photos.length : 0), 0),
    }),
    [galleries]
  );

  const filteredGalleries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return galleries.filter(gallery => {
      if (statusFilter !== 'ALL' && gallery.status !== statusFilter) return false;
      if (!q) return true;
      return (
        gallery.title.toLowerCase().includes(q) ||
        (gallery.subtitle || '').toLowerCase().includes(q) ||
        (gallery.category || '').toLowerCase().includes(q) ||
        (gallery.location || '').toLowerCase().includes(q) ||
        gallery.slug.toLowerCase().includes(q)
      );
    });
  }, [galleries, statusFilter, searchQuery]);

  async function handleCoverUpload(file: File | undefined) {
    if (!file || !editing) return;
    setCoverUploading(true);
    setMessage('');
    try {
      const dataUrl = await readAndOptimizeArticleImage(file);
      setEditing(prev => (prev ? { ...prev, cover: dataUrl } : prev));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Impossible d’importer la photo de couverture.');
    } finally {
      setCoverUploading(false);
      if (coverInputRef.current) coverInputRef.current.value = '';
    }
  }

  async function handleBatchPhotosUpload(fileList: FileList | File[] | null | undefined) {
    const files = Array.from(fileList || []).filter(f => f.type.startsWith('image/'));
    if (!files.length || !editing) return;
    setPhotosUploading(true);
    setMessage('');
    try {
      const added: WebsiteGalleryPhoto[] = [];
      for (const file of files) {
        const dataUrl = await readAndOptimizeArticleImage(file);
        added.push({
          id: makePhotoId(),
          url: dataUrl,
          caption: suggestCaptionFromFilename(file.name),
        });
      }
      setEditing(prev => {
        if (!prev) return prev;
        const nextPhotos = [...prev.photos, ...added].slice(0, 60);
        const nextCover = prev.cover || nextPhotos[0]?.url || '';
        return { ...prev, photos: nextPhotos, cover: nextCover };
      });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Impossible d’importer les photos sélectionnées.');
    } finally {
      setPhotosUploading(false);
      if (photosInputRef.current) photosInputRef.current.value = '';
    }
  }

  function addExternalPhoto() {
    if (!editing) return;
    const trimmedUrl = externalPhotoUrl.trim();
    if (!isSafeArticleImageUrl(trimmedUrl)) {
      setMessage('Saisissez une adresse HTTPS valide pour la photo.');
      return;
    }
    const nextPhoto: WebsiteGalleryPhoto = {
      id: makePhotoId(),
      url: trimmedUrl,
      caption: externalPhotoCaption.trim(),
    };
    setEditing(prev => {
      if (!prev) return prev;
      const nextPhotos = [...prev.photos, nextPhoto].slice(0, 60);
      return {
        ...prev,
        photos: nextPhotos,
        cover: prev.cover || nextPhoto.url,
      };
    });
    setExternalPhotoUrl('');
    setExternalPhotoCaption('');
    setMessage('');
  }

  function updatePhotoCaption(photoId: string, caption: string) {
    setEditing(prev =>
      prev
        ? {
            ...prev,
            photos: prev.photos.map(p => (p.id === photoId ? { ...p, caption } : p)),
          }
        : prev
    );
  }

  function movePhoto(index: number, direction: -1 | 1) {
    setEditing(prev => {
      if (!prev) return prev;
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= prev.photos.length) return prev;
      const next = [...prev.photos];
      const [moved] = next.splice(index, 1);
      next.splice(targetIndex, 0, moved);
      return { ...prev, photos: next };
    });
  }

  function removePhoto(photoId: string) {
    setEditing(prev => {
      if (!prev) return prev;
      const nextPhotos = prev.photos.filter(p => p.id !== photoId);
      return { ...prev, photos: nextPhotos };
    });
  }

  async function save() {
    if (!editing) return;
    setBusy(true);
    setMessage('');
    try {
      const { id, version, title, slug, subtitle, category, location, cover, photos, status } = editing;
      const finalSlug = slugifyWebsiteText(slug || title) || 'album-escen';
      const finalCover = cover || photos[0]?.url || '';
      await saveWebsiteData(
        {
          action: 'gallery-save',
          ...(id ? { id, version } : {}),
          title: title.trim(),
          slug: finalSlug,
          subtitle: subtitle.trim(),
          category: category.trim() || 'Vie étudiante',
          location: location.trim() || 'Campus principal',
          cover: finalCover,
          photos: photos.map(p => ({
            id: p.id,
            url: p.url,
            caption: (p.caption || '').trim(),
          })),
          status,
        },
        role
      );
      setEditing(null);
      setRevision(value => value + 1);
      setSuccess(
        status === 'PUBLIE'
          ? 'Album photo enregistré et publié dans la galerie du site.'
          : status === 'RETIRE'
            ? 'Album retiré du site public. Ses photos restent conservées.'
            : 'Brouillon de l’album photo enregistré.'
      );
      state.refreshCampus();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Enregistrement impossible.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="articles-workspace">
      <FormFeedback message={success} error={false} />
      <PageHeader
        eyebrow="COMMUNICATION & SITE WEB"
        title="Galeries photos"
        description="Créez vos albums photos d’événements, importez vos clichés par lot et publiez-les sur la galerie officielle du site ESCEN."
      >
        {canManage && (
          <button
            className="btn btn-primary"
            aria-label="+ Créer un album photo"
            onClick={() => {
              setSuccess('');
              setMessage('');
              setEditing({ ...emptyGallery, photos: [] });
              setSlugTouched(false);
            }}
          >
            <Plus size={17} aria-hidden="true" />Créer un album photo
          </button>
        )}
      </PageHeader>

      <div className="articles-library">
        <div className="editorial-toolbar">
          <div className="editorial-filter-pills" role="group" aria-label="Filtrer par statut de publication">
            <button
              type="button"
              aria-pressed={statusFilter === 'ALL'}
              className={`btn ${statusFilter === 'ALL' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setStatusFilter('ALL')}
            >
              Tous ({counts.total})
            </button>
            <button
              type="button"
              aria-pressed={statusFilter === 'PUBLIE'}
              className={`btn ${statusFilter === 'PUBLIE' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setStatusFilter('PUBLIE')}
            >
              Publiés ({counts.published})
            </button>
            <button
              type="button"
              aria-pressed={statusFilter === 'BROUILLON'}
              className={`btn ${statusFilter === 'BROUILLON' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setStatusFilter('BROUILLON')}
            >
              Brouillons ({counts.drafts})
            </button>
            <button
              type="button"
              aria-pressed={statusFilter === 'RETIRE'}
              className={`btn ${statusFilter === 'RETIRE' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setStatusFilter('RETIRE')}
            >
              Retirés ({counts.retired})
            </button>
          </div>
          <div className="editorial-search-wrap">
            <input
              className="input"
              type="search"
              aria-label="Rechercher un album photo"
              placeholder="Rechercher par titre, événement, catégorie ou lieu…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {message && !editing && <p className="auth-error" role="alert">{message}</p>}
        {loadError ? (
          <section className="card" role="alert">
            <h2>Galeries photos indisponibles</h2>
            <p>{loadError}</p>
            <IconButton className="btn btn-outline" onClick={() => setRevision(value => value + 1)} label="Réessayer" />
          </section>
        ) : loading ? (
          <LoadingState label="Chargement des albums photos…" variant="cards" />
        ) : (
          <div className="articles-results">
            <div className="card-header">
              <h2>Albums photos de l’établissement</h2>
              <span className="cell-sub">
                {filteredGalleries.length} {filteredGalleries.length > 1 ? 'albums affichés' : 'album affiché'}
              </span>
            </div>
            {filteredGalleries.length === 0 ? (
              <div className="articles-empty">
                <Images size={30} aria-hidden="true" />
                <h3>{galleries.length === 0 ? 'Aucun album photo enregistré' : 'Aucun résultat'}</h3>
                <p>
                  {galleries.length === 0
                    ? 'Utilisez « Créer un album photo » pour importer vos photos de cérémonies, ateliers et événements du campus.'
                    : 'Essayez un autre mot-clé ou un autre filtre.'}
                </p>
              </div>
            ) : (
              <div className="gallery-albums-grid">
                {filteredGalleries.map(album => {
                  const coverSrc = album.cover || album.photos?.[0]?.url || '';
                  const photoCount = Array.isArray(album.photos) ? album.photos.length : 0;
                  return (
                    <article className="gallery-album-card" key={album.id}>
                      <div className="gallery-album-cover">
                        {coverSrc ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={coverSrc} alt={album.title} loading="lazy" />
                        ) : (
                          <div className="gallery-album-placeholder">
                            <Images size={32} aria-hidden="true" />
                            <span>Aucune photo</span>
                          </div>
                        )}
                        <span className="gallery-album-count-badge">
                          <Images size={13} aria-hidden="true" />
                          {photoCount} {photoCount > 1 ? 'photos' : 'photo'}
                        </span>
                      </div>
                      <div className="gallery-album-body">
                        <div className="editorial-article-meta">
                          <span
                            className={`pill ${
                              album.status === 'PUBLIE'
                                ? 'pill-success'
                                : album.status === 'BROUILLON'
                                  ? 'pill-warning'
                                  : 'pill-default'
                            }`}
                          >
                            {statusLabels[album.status]}
                          </span>
                          {album.category && (
                            <span className="gallery-meta-chip">
                              <Tag size={12} aria-hidden="true" />
                              {album.category}
                            </span>
                          )}
                          {album.location && (
                            <span className="gallery-meta-chip">
                              <MapPin size={12} aria-hidden="true" />
                              {album.location}
                            </span>
                          )}
                        </div>
                        <h3>{album.title}</h3>
                        {album.subtitle && <p>{album.subtitle}</p>}
                        <p className="article-row-address">Version {album.version} · /galerie/{album.slug}</p>
                        <div className="gallery-album-actions">
                          {photoCount > 0 && (
                            <button
                              type="button"
                              className="btn btn-outline btn-sm"
                              onClick={() => {
                                setViewingAlbum(album);
                                setLightboxIndex(0);
                              }}
                            >
                              <Eye size={14} aria-hidden="true" />Diaporama ({photoCount})
                            </button>
                          )}
                          {canManage && (
                            <button
                              type="button"
                              className="btn btn-outline btn-sm"
                              aria-label={`Modifier : ${album.title}`}
                              onClick={() => {
                                setSuccess('');
                                setMessage('');
                                setEditing({
                                  ...album,
                                  subtitle: album.subtitle || '',
                                  category: album.category || 'Vie étudiante',
                                  location: album.location || 'Campus principal',
                                  cover: album.cover || '',
                                  photos: Array.isArray(album.photos) ? [...album.photos] : [],
                                });
                                setSlugTouched(true);
                              }}
                            >
                              <Pencil size={14} aria-hidden="true" />Modifier
                            </button>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {viewingAlbum && (
        <DetailDrawer
          title={`${viewingAlbum.title} (${viewingAlbum.photos.length} photo${viewingAlbum.photos.length > 1 ? 's' : ''})`}
          onClose={() => setViewingAlbum(null)}
        >
          <div className="gallery-lightbox-viewer">
            {viewingAlbum.photos[lightboxIndex] && (
              <>
                <div className="gallery-lightbox-stage">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={viewingAlbum.photos[lightboxIndex].url}
                    alt={viewingAlbum.photos[lightboxIndex].caption || `${viewingAlbum.title} — Photo ${lightboxIndex + 1}`}
                  />
                </div>
                <div className="gallery-lightbox-controls">
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    disabled={viewingAlbum.photos.length <= 1}
                    onClick={() =>
                      setLightboxIndex(idx => (idx > 0 ? idx - 1 : viewingAlbum.photos.length - 1))
                    }
                  >
                    <ChevronLeft size={16} aria-hidden="true" />Précédente
                  </button>
                  <div className="gallery-lightbox-caption">
                    <strong>
                      Photo {lightboxIndex + 1} / {viewingAlbum.photos.length}
                    </strong>
                    {viewingAlbum.photos[lightboxIndex].caption && (
                      <span>{viewingAlbum.photos[lightboxIndex].caption}</span>
                    )}
                  </div>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    disabled={viewingAlbum.photos.length <= 1}
                    onClick={() =>
                      setLightboxIndex(idx => (idx < viewingAlbum.photos.length - 1 ? idx + 1 : 0))
                    }
                  >
                    Suivante<ChevronRight size={16} aria-hidden="true" />
                  </button>
                </div>
                <div className="gallery-lightbox-thumbs">
                  {viewingAlbum.photos.map((photo, idx) => (
                    <button
                      type="button"
                      key={photo.id || idx}
                      className={`gallery-lightbox-thumb ${idx === lightboxIndex ? 'active' : ''}`}
                      onClick={() => setLightboxIndex(idx)}
                      aria-label={`Afficher la photo ${idx + 1}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photo.url} alt={photo.caption || `Miniature ${idx + 1}`} />
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </DetailDrawer>
      )}

      {editing && (
        <WorkPage
          busy={busy}
          title={editing.id ? 'Modifier l’album photo' : 'Créer un album photo'}
          onClose={() => {
            if (!busy) setEditing(null);
          }}
        >
          <ReviewedForm
            className="article-compose-form"
            busy={busy}
            error={message}
            confirmLabel="Confirmer l’enregistrement"
            fields={[
              {
                label: 'Titre de l’album',
                value: editing.title,
                previous: galleries.find(g => g.id === editing.id)?.title,
              },
              { label: 'Adresse publique', value: `/galerie/${editing.slug}` },
              { label: 'Événement / Sous-titre', value: editing.subtitle || '—' },
              { label: 'Catégorie', value: editing.category },
              { label: 'Lieu', value: editing.location },
              {
                label: 'Photo de couverture',
                value: editing.cover
                  ? editing.cover.startsWith('data:image/')
                    ? 'Photo importée depuis l’appareil'
                    : editing.cover
                  : editing.photos[0]
                    ? 'Première photo de l’album'
                    : 'Aucune',
              },
              { label: 'Nombre de photos', value: `${editing.photos.length} photo(s)` },
              {
                label: 'Diffusion',
                value: statusLabels[editing.status],
                previous: editing.id
                  ? statusLabels[galleries.find(g => g.id === editing.id)?.status || 'BROUILLON']
                  : undefined,
              },
            ]}
            consequence={
              editing.status === 'PUBLIE'
                ? 'Cet album et ses photos seront visibles publiquement dans la galerie du site ESCEN.'
                : editing.status === 'RETIRE'
                  ? 'Cet album sera retiré de la galerie publique ; ses photos resteront conservées dans le portail.'
                  : 'Cet album restera en brouillon privé dans le portail.'
            }
            validate={() =>
              editing.title.trim().length < 3
                ? 'Indiquez un titre d’album d’au moins 3 caractères.'
                : editing.status === 'PUBLIE' && editing.photos.length === 0 && !editing.cover
                  ? 'Ajoutez au moins une photo avant de publier l’album sur le site.'
                  : null
            }
            onConfirm={() => void save()}
          >
            {message && (
              <p role="alert" className="auth-error">
                {message}
              </p>
            )}
            <div className="article-compose-layout">
              <div className="article-compose-main">
                <div className="article-compose-heading">
                  <span className="page-eyebrow">ALBUM PHOTO</span>
                  <h3>Informations & Photos de l’album</h3>
                  <p>Décrivez l’événement et importez toutes les photos de la galerie.</p>
                </div>

                <div className="form-grid">
                  <label className="form-group">
                    Titre de l’album
                    <input
                      className="input"
                      required
                      minLength={3}
                      maxLength={180}
                      placeholder="Ex : Remise des diplômes promotion 2026"
                      value={editing.title}
                      onChange={event => {
                        const nextTitle = event.target.value;
                        setEditing({
                          ...editing,
                          title: nextTitle,
                          slug: !editing.id && !slugTouched ? slugifyWebsiteText(nextTitle) : editing.slug,
                        });
                      }}
                    />
                  </label>
                  <label className="form-group">
                    Sous-titre / Date de l’événement
                    <input
                      className="input"
                      maxLength={300}
                      placeholder="Ex : Cérémonie officielle · Octobre 2026"
                      value={editing.subtitle}
                      onChange={event => setEditing({ ...editing, subtitle: event.target.value })}
                    />
                  </label>
                </div>

                <div className="form-grid">
                  <label className="form-group">
                    Catégorie
                    <select
                      className="select-input"
                      value={editing.category}
                      onChange={event => setEditing({ ...editing, category: event.target.value })}
                    >
                      {GALLERY_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="form-group">
                    Lieu
                    <input
                      className="input"
                      maxLength={160}
                      placeholder="Ex : Campus principal ESCEN Lomé"
                      value={editing.location}
                      onChange={event => setEditing({ ...editing, location: event.target.value })}
                    />
                  </label>
                </div>

                <div
                  className="gallery-photos-dropzone"
                  onDragOver={event => event.preventDefault()}
                  onDrop={event => {
                    event.preventDefault();
                    void handleBatchPhotosUpload(event.dataTransfer?.files);
                  }}
                >
                  <input
                    ref={photosInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    hidden
                    onChange={event => void handleBatchPhotosUpload(event.target.files)}
                  />
                  <div className="gallery-photos-dropzone-head">
                    <div>
                      <strong>Photos de l’album ({editing.photos.length}/60)</strong>
                      <span>
                        Importez plusieurs photos à la fois (JPG, PNG, WebP) depuis votre ordinateur ou glissez-déposez vos fichiers ici.
                      </span>
                    </div>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      disabled={busy || photosUploading || editing.photos.length >= 60}
                      onClick={() => photosInputRef.current?.click()}
                    >
                      <Upload size={15} aria-hidden="true" />
                      {photosUploading ? 'Importation en cours…' : 'Importer des photos (sélection multiple)'}
                    </button>
                  </div>

                  <div className="gallery-external-photo-row">
                    <input
                      className="input"
                      type="url"
                      placeholder="Ou ajouter une photo par adresse HTTPS (https://...)"
                      value={externalPhotoUrl}
                      onChange={event => setExternalPhotoUrl(event.target.value)}
                    />
                    <input
                      className="input"
                      placeholder="Légende (facultatif)"
                      maxLength={300}
                      value={externalPhotoCaption}
                      onChange={event => setExternalPhotoCaption(event.target.value)}
                    />
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      disabled={busy || !externalPhotoUrl.trim()}
                      onClick={addExternalPhoto}
                    >
                      Ajouter l’URL
                    </button>
                  </div>

                  {editing.photos.length === 0 ? (
                    <div className="gallery-photos-empty">
                      <Images size={28} aria-hidden="true" />
                      <p>Aucune photo dans cet album pour le moment. Cliquez sur « Importer des photos » ci-dessus.</p>
                    </div>
                  ) : (
                    <div className="gallery-editor-photos-grid">
                      {editing.photos.map((photo, index) => {
                        const isCover = editing.cover === photo.url || (!editing.cover && index === 0);
                        return (
                          <div className={`gallery-editor-photo-card ${isCover ? 'is-cover' : ''}`} key={photo.id}>
                            <div className="gallery-editor-photo-thumb">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={photo.url} alt={photo.caption || `Photo ${index + 1}`} />
                              <span className="gallery-editor-photo-index">#{index + 1}</span>
                              {isCover && <span className="gallery-editor-cover-badge">Couverture</span>}
                            </div>
                            <input
                              className="input gallery-editor-caption-input"
                              aria-label={`Légende de la photo ${index + 1}`}
                              placeholder="Légende de la photo…"
                              maxLength={300}
                              value={photo.caption || ''}
                              onChange={event => updatePhotoCaption(photo.id, event.target.value)}
                            />
                            <div className="gallery-editor-photo-actions">
                              <button
                                type="button"
                                className="btn btn-outline btn-sm"
                                disabled={busy || isCover}
                                title="Définir comme photo de couverture de l’album"
                                onClick={() => setEditing({ ...editing, cover: photo.url })}
                              >
                                <Sparkles size={13} aria-hidden="true" />
                                {isCover ? 'Couverture' : 'Choisir en couverture'}
                              </button>
                              <div className="gallery-editor-order-btns">
                                <button
                                  type="button"
                                  className="btn btn-outline btn-sm"
                                  disabled={busy || index === 0}
                                  aria-label={`Monter la photo ${index + 1}`}
                                  onClick={() => movePhoto(index, -1)}
                                >
                                  <ArrowUp size={13} aria-hidden="true" />
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-outline btn-sm"
                                  disabled={busy || index === editing.photos.length - 1}
                                  aria-label={`Descendre la photo ${index + 1}`}
                                  onClick={() => movePhoto(index, 1)}
                                >
                                  <ArrowDown size={13} aria-hidden="true" />
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-outline btn-sm"
                                  disabled={busy}
                                  aria-label={`Supprimer la photo ${index + 1}`}
                                  onClick={() => removePhoto(photo.id)}
                                >
                                  <Trash2 size={13} aria-hidden="true" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <aside className="article-compose-settings" aria-label="Réglages de publication de l’album">
                <div className="article-compose-heading">
                  <span className="page-eyebrow">PUBLICATION</span>
                  <h3>Réglages de l’album</h3>
                </div>
                <label className="form-group">
                  Diffusion
                  <select
                    aria-label="Diffusion"
                    className="select-input"
                    value={editing.status}
                    onChange={event =>
                      setEditing({ ...editing, status: event.target.value as WebsiteGallery['status'] })
                    }
                  >
                    <option value="BROUILLON">Brouillon privé</option>
                    <option value="PUBLIE">Publié sur le site</option>
                    <option value="RETIRE">Retiré du site</option>
                  </select>
                  <span className="article-field-help">
                    {editing.status === 'PUBLIE'
                      ? 'Visible dans la galerie publique du site ESCEN.'
                      : editing.status === 'RETIRE'
                        ? 'Masqué du site public, conservé dans le portail.'
                        : 'Visible uniquement dans le portail.'}
                  </span>
                </label>

                <label className="form-group">
                  Adresse de l’album
                  <input
                    className="input"
                    required
                    pattern="[a-z0-9]+(-[a-z0-9]+)*"
                    maxLength={180}
                    placeholder="remise-diplomes-2026"
                    value={editing.slug}
                    onChange={event => {
                      setSlugTouched(true);
                      setEditing({ ...editing, slug: event.target.value });
                    }}
                  />
                </label>

                <div className="article-cover-uploader">
                  <span className="article-cover-label">Photo de couverture de l’album</span>
                  <input
                    ref={coverInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    hidden
                    onChange={event => void handleCoverUpload(event.target.files?.[0])}
                  />
                  {editing.cover || editing.photos[0]?.url ? (
                    <div className="article-cover-preview">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={editing.cover || editing.photos[0]?.url} alt="Aperçu de la couverture de l’album" />
                      <div className="article-cover-preview-actions">
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          disabled={busy || coverUploading}
                          onClick={() => coverInputRef.current?.click()}
                        >
                          <ImagePlus size={14} aria-hidden="true" />Changer
                        </button>
                        {editing.cover && (
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            disabled={busy}
                            onClick={() => setEditing({ ...editing, cover: '' })}
                          >
                            <Trash2 size={14} aria-hidden="true" />Réinitialiser
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-outline article-cover-pick-btn"
                      disabled={busy || coverUploading}
                      onClick={() => coverInputRef.current?.click()}
                    >
                      <ImagePlus size={16} aria-hidden="true" />
                      {coverUploading ? 'Importation…' : 'Importer une photo de couverture'}
                    </button>
                  )}
                </div>

                <label className="form-group">
                  Couverture — URL HTTPS (facultatif)
                  <input
                    className="input"
                    type="url"
                    pattern="https://.*"
                    placeholder="https://..."
                    value={editing.cover.startsWith('data:image/') ? '' : editing.cover}
                    onChange={event => setEditing({ ...editing, cover: event.target.value })}
                  />
                  <span className="article-field-help">
                    Si aucune couverture spécifique n’est choisie, la première photo de l’album est utilisée automatiquement.
                  </span>
                </label>
              </aside>
            </div>

            <DrawerActions>
              <button className="btn btn-primary" disabled={busy}>
                Relire avant enregistrement
              </button>
            </DrawerActions>
          </ReviewedForm>
        </WorkPage>
      )}
    </section>
  );
}

