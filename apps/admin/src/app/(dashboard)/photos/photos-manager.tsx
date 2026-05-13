'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Pencil, Trash2, Plus, X, ChevronDown, ChevronUp } from 'lucide-react';
import { ImageUploader } from '@/components/image-uploader';
import { useAdminLocale } from '@/components/locale-provider';

interface Photo {
  id: number;
  src: string;
  alt: string;
  width: number;
  height: number;
  location: string | null;
  takenAt: string;
  storyEn: string | null;
  storyZh: string | null;
  exif: string | null;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

interface ExifData {
  camera?: string;
  lens?: string;
  iso?: number;
  aperture?: string;
  shutter?: string;
}

interface FormData {
  src: string;
  alt: string;
  width: number;
  height: number;
  location: string;
  takenAt: string;
  storyEn: string;
  storyZh: string;
  sortOrder: number;
  camera: string;
  lens: string;
  iso: number | '';
  aperture: string;
  shutter: string;
}

const emptyForm: FormData = {
  src: '',
  alt: '',
  width: 0,
  height: 0,
  location: '',
  takenAt: '',
  storyEn: '',
  storyZh: '',
  sortOrder: 0,
  camera: '',
  lens: '',
  iso: '',
  aperture: '',
  shutter: '',
};

function parseExif(exifString: string | null): ExifData {
  if (!exifString) return {};
  try {
    return JSON.parse(exifString) as ExifData;
  } catch {
    return {};
  }
}

function buildExifString(form: FormData): string | null {
  const exif: ExifData = {};
  if (form.camera) exif.camera = form.camera;
  if (form.lens) exif.lens = form.lens;
  if (form.iso) exif.iso = Number(form.iso);
  if (form.aperture) exif.aperture = form.aperture;
  if (form.shutter) exif.shutter = form.shutter;
  if (Object.keys(exif).length === 0) return null;
  return JSON.stringify(exif);
}

export function PhotosManager({ initialPhotos }: { initialPhotos: Photo[] }) {
  const router = useRouter();
  const { t } = useAdminLocale();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [exifOpen, setExifOpen] = useState(false);

  function openCreateForm() {
    setEditingId(null);
    setForm(emptyForm);
    setExifOpen(false);
    setShowForm(true);
  }

  function openEditForm(photo: Photo) {
    const exif = parseExif(photo.exif);
    setEditingId(photo.id);
    setForm({
      src: photo.src,
      alt: photo.alt,
      width: photo.width,
      height: photo.height,
      location: photo.location ?? '',
      takenAt: photo.takenAt,
      storyEn: photo.storyEn ?? '',
      storyZh: photo.storyZh ?? '',
      sortOrder: photo.sortOrder ?? 0,
      camera: exif.camera ?? '',
      lens: exif.lens ?? '',
      iso: exif.iso ?? '',
      aperture: exif.aperture ?? '',
      shutter: exif.shutter ?? '',
    });
    setExifOpen(Boolean(exif.camera || exif.lens || exif.iso || exif.aperture || exif.shutter));
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);

    // Auto-translate storyZh → storyEn
    let storyEn = form.storyEn || null;
    if (form.storyZh.trim() && !form.storyEn.trim()) {
      try {
        const trRes = await fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ texts: [{ text: form.storyZh.trim(), type: 'description' }] }),
        });
        if (trRes.ok) {
          const trData = await trRes.json();
          storyEn = trData.results?.[0]?.translated || null;
        }
      } catch {
        /* translation failure is non-blocking */
      }
    }

    const payload = {
      src: form.src,
      alt: form.alt,
      width: form.width,
      height: form.height,
      location: form.location || null,
      takenAt: form.takenAt,
      storyEn,
      storyZh: form.storyZh || null,
      exif: buildExifString(form),
      sortOrder: form.sortOrder,
    };

    try {
      const url = editingId ? `/api/photos/${editingId}` : '/api/photos';
      const method = editingId ? 'PATCH' : 'POST';
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error ?? 'Request failed');
      }

      toast.success(editingId ? t('photos.toastUpdated') : t('photos.toastCreated'));
      closeForm();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('common.somethingWrong'));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(photoId: number) {
    if (!confirm(t('photos.confirmDelete'))) return;

    try {
      const response = await fetch(`/api/photos/${photoId}`, { method: 'DELETE' });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error ?? t('common.deleteFailed'));
      }
      toast.success(t('photos.toastDeleted'));
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('common.somethingWrong'));
    }
  }

  function updateField<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t('page.photos.title')}</h2>
          <p className="text-muted-foreground">{t('page.photos.desc')}</p>
        </div>
        <button
          onClick={openCreateForm}
          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors"
        >
          <Plus className="h-4 w-4" />
          {t('photos.addPhoto')}
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="border-border bg-card rounded-lg border p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold">
              {editingId ? t('photos.editTitle') : t('photos.newTitle')}
            </h3>
            <button onClick={closeForm} className="text-muted-foreground hover:text-foreground">
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Image Upload */}
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('photos.fieldImage')}</label>
              <ImageUploader
                value={form.src}
                onChange={(url) => updateField('src', url)}
                prefix="photos"
              />
            </div>

            {/* Alt */}
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('photos.fieldAlt')}</label>
              <input
                type="text"
                value={form.alt}
                onChange={(event) => updateField('alt', event.target.value)}
                required
                className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
              />
            </div>

            {/* Width / Height / Sort Order */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('photos.fieldWidth')}</label>
                <input
                  type="number"
                  value={form.width || ''}
                  onChange={(event) => updateField('width', Number(event.target.value))}
                  required
                  min={1}
                  className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('photos.fieldHeight')}</label>
                <input
                  type="number"
                  value={form.height || ''}
                  onChange={(event) => updateField('height', Number(event.target.value))}
                  required
                  min={1}
                  className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('common.sortOrder')}</label>
                <input
                  type="number"
                  value={form.sortOrder}
                  onChange={(event) => updateField('sortOrder', Number(event.target.value))}
                  className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
                />
              </div>
            </div>

            {/* Location / Taken At */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('photos.fieldLocation')}</label>
                <input
                  type="text"
                  value={form.location}
                  onChange={(event) => updateField('location', event.target.value)}
                  className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
                  placeholder="Tokyo, Japan"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('photos.fieldTakenAt')}</label>
                <input
                  type="date"
                  value={form.takenAt}
                  onChange={(event) => updateField('takenAt', event.target.value)}
                  required
                  className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
                />
              </div>
            </div>

            {/* Story ZH (auto-translate to EN on save) */}
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('photos.fieldStory')}</label>
              <textarea
                value={form.storyZh}
                onChange={(event) => updateField('storyZh', event.target.value)}
                rows={3}
                className="border-input bg-background w-full resize-y rounded-md border px-3 py-2 text-sm"
              />
            </div>

            {/* EXIF - Collapsible */}
            <div className="border-border rounded-md border">
              <button
                type="button"
                onClick={() => setExifOpen(!exifOpen)}
                className="hover:bg-muted/50 flex w-full items-center justify-between px-4 py-3 text-sm font-medium transition-colors"
              >
                <span>{t('photos.exifData')}</span>
                {exifOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              {exifOpen && (
                <div className="border-border space-y-4 border-t px-4 py-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">{t('photos.fieldCamera')}</label>
                      <input
                        type="text"
                        value={form.camera}
                        onChange={(event) => updateField('camera', event.target.value)}
                        className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
                        placeholder="Sony A7IV"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">{t('photos.fieldLens')}</label>
                      <input
                        type="text"
                        value={form.lens}
                        onChange={(event) => updateField('lens', event.target.value)}
                        className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
                        placeholder="24-70mm f/2.8"
                      />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">{t('photos.fieldIso')}</label>
                      <input
                        type="number"
                        value={form.iso}
                        onChange={(event) =>
                          updateField('iso', event.target.value ? Number(event.target.value) : '')
                        }
                        className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
                        placeholder="100"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">{t('photos.fieldAperture')}</label>
                      <input
                        type="text"
                        value={form.aperture}
                        onChange={(event) => updateField('aperture', event.target.value)}
                        className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
                        placeholder="f/2.8"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">{t('photos.fieldShutter')}</label>
                      <input
                        type="text"
                        value={form.shutter}
                        onChange={(event) => updateField('shutter', event.target.value)}
                        className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
                        placeholder="1/250s"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Submit */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={closeForm}
                className="border-input hover:bg-muted rounded-md border px-4 py-2 text-sm font-medium transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
              >
                {submitting
                  ? t('common.saving')
                  : editingId
                    ? t('common.update')
                    : t('common.create')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Photo Grid */}
      {initialPhotos.length === 0 ? (
        <div className="border-border text-muted-foreground rounded-lg border border-dashed p-12 text-center">
          {t('photos.empty')}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {initialPhotos.map((photo) => (
            <div
              key={photo.id}
              className="group border-border bg-card relative overflow-hidden rounded-lg border shadow-sm transition-shadow hover:shadow-md"
            >
              {/* Thumbnail */}
              <div className="bg-muted aspect-4/3 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.src}
                  alt={photo.alt}
                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                />
              </div>

              {/* Info */}
              <div className="space-y-1 p-3">
                <p className="truncate text-sm font-medium">{photo.alt}</p>
                <div className="text-muted-foreground flex items-center gap-2 text-xs">
                  {photo.location && <span>{photo.location}</span>}
                  {photo.location && photo.takenAt && <span>·</span>}
                  {photo.takenAt && <span>{photo.takenAt}</span>}
                </div>
              </div>

              {/* Actions */}
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  onClick={() => openEditForm(photo)}
                  className="bg-background/80 text-foreground hover:bg-background rounded-md p-1.5 shadow-sm backdrop-blur"
                  title={t('common.edit')}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(photo.id)}
                  className="bg-background/80 text-destructive hover:bg-background rounded-md p-1.5 shadow-sm backdrop-blur"
                  title={t('common.delete')}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
