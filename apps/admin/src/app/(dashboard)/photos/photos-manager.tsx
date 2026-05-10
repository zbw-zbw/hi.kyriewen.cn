'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Pencil, Trash2, Plus, X, ChevronDown, ChevronUp } from 'lucide-react';
import { ImageUploader } from '@/components/image-uploader';

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

    const payload = {
      src: form.src,
      alt: form.alt,
      width: form.width,
      height: form.height,
      location: form.location || null,
      takenAt: form.takenAt,
      storyEn: form.storyEn || null,
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

      toast.success(editingId ? 'Photo updated' : 'Photo created');
      closeForm();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(photoId: number) {
    if (!confirm('Are you sure you want to delete this photo?')) return;

    try {
      const response = await fetch(`/api/photos/${photoId}`, { method: 'DELETE' });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error ?? 'Delete failed');
      }
      toast.success('Photo deleted');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Something went wrong');
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
          <h2 className="text-2xl font-bold tracking-tight">Photos</h2>
          <p className="text-muted-foreground">Manage your photo gallery.</p>
        </div>
        <button
          onClick={openCreateForm}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Photo
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold">
              {editingId ? 'Edit Photo' : 'New Photo'}
            </h3>
            <button onClick={closeForm} className="text-muted-foreground hover:text-foreground">
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Image Upload */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Image *</label>
              <ImageUploader
                value={form.src}
                onChange={(url) => updateField('src', url)}
                prefix="photos"
              />
            </div>

            {/* Alt */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Alt Text *</label>
              <input
                type="text"
                value={form.alt}
                onChange={(event) => updateField('alt', event.target.value)}
                required
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            {/* Width / Height / Sort Order */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Width *</label>
                <input
                  type="number"
                  value={form.width || ''}
                  onChange={(event) => updateField('width', Number(event.target.value))}
                  required
                  min={1}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Height *</label>
                <input
                  type="number"
                  value={form.height || ''}
                  onChange={(event) => updateField('height', Number(event.target.value))}
                  required
                  min={1}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Sort Order</label>
                <input
                  type="number"
                  value={form.sortOrder}
                  onChange={(event) => updateField('sortOrder', Number(event.target.value))}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
            </div>

            {/* Location / Taken At */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Location</label>
                <input
                  type="text"
                  value={form.location}
                  onChange={(event) => updateField('location', event.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Tokyo, Japan"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Taken At *</label>
                <input
                  type="date"
                  value={form.takenAt}
                  onChange={(event) => updateField('takenAt', event.target.value)}
                  required
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
            </div>

            {/* Story En / Zh */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Story (EN)</label>
                <textarea
                  value={form.storyEn}
                  onChange={(event) => updateField('storyEn', event.target.value)}
                  rows={3}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-y"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Story (ZH)</label>
                <textarea
                  value={form.storyZh}
                  onChange={(event) => updateField('storyZh', event.target.value)}
                  rows={3}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-y"
                />
              </div>
            </div>

            {/* EXIF - Collapsible */}
            <div className="rounded-md border border-border">
              <button
                type="button"
                onClick={() => setExifOpen(!exifOpen)}
                className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium hover:bg-muted/50 transition-colors"
              >
                <span>EXIF Data</span>
                {exifOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              {exifOpen && (
                <div className="border-t border-border px-4 py-4 space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Camera</label>
                      <input
                        type="text"
                        value={form.camera}
                        onChange={(event) => updateField('camera', event.target.value)}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        placeholder="Sony A7IV"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Lens</label>
                      <input
                        type="text"
                        value={form.lens}
                        onChange={(event) => updateField('lens', event.target.value)}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        placeholder="24-70mm f/2.8"
                      />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">ISO</label>
                      <input
                        type="number"
                        value={form.iso}
                        onChange={(event) => updateField('iso', event.target.value ? Number(event.target.value) : '')}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        placeholder="100"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Aperture</label>
                      <input
                        type="text"
                        value={form.aperture}
                        onChange={(event) => updateField('aperture', event.target.value)}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        placeholder="f/2.8"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Shutter</label>
                      <input
                        type="text"
                        value={form.shutter}
                        onChange={(event) => updateField('shutter', event.target.value)}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
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
                className="rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {submitting ? 'Saving...' : editingId ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Photo Grid */}
      {initialPhotos.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center text-muted-foreground">
          No photos yet. Click &quot;Add Photo&quot; to get started.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {initialPhotos.map((photo) => (
            <div
              key={photo.id}
              className="group relative overflow-hidden rounded-lg border border-border bg-card shadow-sm transition-shadow hover:shadow-md"
            >
              {/* Thumbnail */}
              <div className="aspect-4/3 overflow-hidden bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.src}
                  alt={photo.alt}
                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                />
              </div>

              {/* Info */}
              <div className="p-3 space-y-1">
                <p className="text-sm font-medium truncate">{photo.alt}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {photo.location && <span>{photo.location}</span>}
                  {photo.location && photo.takenAt && <span>·</span>}
                  {photo.takenAt && <span>{photo.takenAt}</span>}
                </div>
              </div>

              {/* Actions */}
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => openEditForm(photo)}
                  className="rounded-md bg-background/80 backdrop-blur p-1.5 text-foreground hover:bg-background shadow-sm"
                  title="Edit"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(photo.id)}
                  className="rounded-md bg-background/80 backdrop-blur p-1.5 text-destructive hover:bg-background shadow-sm"
                  title="Delete"
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
