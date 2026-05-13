'use client';

import { useRouter } from 'next/navigation';
import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { useAdminLocale } from '@/components/locale-provider';

/* ── Types ───────────────────────────────────────────────────── */
interface UsesSection {
  id: number;
  sectionId: string;
  titleEn: string;
  titleZh: string;
  sortOrder: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

interface UsesItem {
  id: number;
  sectionId: number;
  name: string;
  url: string | null;
  noteEn: string | null;
  noteZh: string | null;
  rating: number | null;
  verdictEn: string | null;
  verdictZh: string | null;
  since: string | null;
  sortOrder: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

interface SectionFormData {
  sectionId: string;
  titleEn: string;
  titleZh: string;
  sortOrder: number;
}

interface ItemFormData {
  name: string;
  url: string;
  noteEn: string;
  noteZh: string;
  rating: number;
  verdictEn: string;
  verdictZh: string;
  since: string;
  sortOrder: number;
}

const EMPTY_SECTION_FORM: SectionFormData = {
  sectionId: '',
  titleEn: '',
  titleZh: '',
  sortOrder: 0,
};

const EMPTY_ITEM_FORM: ItemFormData = {
  name: '',
  url: '',
  noteEn: '',
  noteZh: '',
  rating: 3,
  verdictEn: '',
  verdictZh: '',
  since: '',
  sortOrder: 0,
};

/* ── Component ───────────────────────────────────────────────── */
export default function UsesManager({
  sections,
  items,
}: {
  sections: UsesSection[];
  items: UsesItem[];
}) {
  const router = useRouter();
  const { t } = useAdminLocale();
  const [loading, setLoading] = useState(false);

  // Section state
  const [showSectionForm, setShowSectionForm] = useState(false);
  const [editingSectionId, setEditingSectionId] = useState<number | null>(null);
  const [sectionForm, setSectionForm] = useState<SectionFormData>(EMPTY_SECTION_FORM);
  const [collapsedSections, setCollapsedSections] = useState<Set<number>>(new Set());

  // Item state
  const [showItemFormFor, setShowItemFormFor] = useState<number | null>(null);
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [itemForm, setItemForm] = useState<ItemFormData>(EMPTY_ITEM_FORM);
  const [itemLangTab, setItemLangTab] = useState<Record<number, 'en' | 'zh'>>({});

  /* ── Section Handlers ────────────────────────────────────────── */
  const toggleCollapse = useCallback((id: number) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const openCreateSection = useCallback(() => {
    setEditingSectionId(null);
    setSectionForm(EMPTY_SECTION_FORM);
    setShowSectionForm(true);
  }, []);

  const openEditSection = useCallback((section: UsesSection) => {
    setEditingSectionId(section.id);
    setSectionForm({
      sectionId: section.sectionId,
      titleEn: section.titleEn,
      titleZh: section.titleZh,
      sortOrder: section.sortOrder,
    });
    setShowSectionForm(true);
  }, []);

  const handleSectionSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      try {
        // Auto-translate titleZh → titleEn
        const payload = { ...sectionForm };
        if (sectionForm.titleZh.trim()) {
          try {
            const trRes = await fetch('/api/translate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                texts: [{ text: sectionForm.titleZh.trim(), type: 'title' }],
              }),
            });
            if (trRes.ok) {
              const trData = await trRes.json();
              const translated = trData.results?.[0]?.translated;
              if (translated) payload.titleEn = translated;
            }
          } catch {
            /* non-blocking */
          }
        }

        const isEdit = editingSectionId !== null;
        const url = isEdit ? `/api/uses/${editingSectionId}` : '/api/uses';
        const method = isEdit ? 'PATCH' : 'POST';

        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Request failed');
        }

        toast.success(isEdit ? t('uses.sectionUpdated') : t('uses.sectionCreated'));
        setShowSectionForm(false);
        setSectionForm(EMPTY_SECTION_FORM);
        setEditingSectionId(null);
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : t('common.error'));
      } finally {
        setLoading(false);
      }
    },
    [editingSectionId, sectionForm, router, t],
  );

  const handleDeleteSection = useCallback(
    async (id: number) => {
      if (!confirm(t('uses.confirmDeleteSection'))) return;
      setLoading(true);
      try {
        const res = await fetch(`/api/uses/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Delete failed');
        toast.success(t('uses.sectionDeleted'));
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : t('common.error'));
      } finally {
        setLoading(false);
      }
    },
    [router, t],
  );

  /* ── Item Handlers ───────────────────────────────────────────── */
  const openCreateItem = useCallback((sectionId: number) => {
    setEditingItemId(null);
    setItemForm(EMPTY_ITEM_FORM);
    setShowItemFormFor(sectionId);
  }, []);

  const openEditItem = useCallback((item: UsesItem) => {
    setEditingItemId(item.id);
    setItemForm({
      name: item.name,
      url: item.url || '',
      noteEn: item.noteEn || '',
      noteZh: item.noteZh || '',
      rating: item.rating ?? 3,
      verdictEn: item.verdictEn || '',
      verdictZh: item.verdictZh || '',
      since: item.since || '',
      sortOrder: item.sortOrder,
    });
    setShowItemFormFor(item.sectionId);
  }, []);

  const handleItemSubmit = useCallback(
    async (e: React.FormEvent, sectionId: number) => {
      e.preventDefault();
      setLoading(true);
      try {
        // Auto-translate zh → en fields
        const translatedForm = { ...itemForm };
        const textsToTranslate = [
          ...(itemForm.noteZh.trim()
            ? [{ text: itemForm.noteZh.trim(), type: 'description', field: 'noteZh' }]
            : []),
          ...(itemForm.verdictZh.trim()
            ? [{ text: itemForm.verdictZh.trim(), type: 'short', field: 'verdictZh' }]
            : []),
        ];
        if (textsToTranslate.length > 0) {
          try {
            const trRes = await fetch('/api/translate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ texts: textsToTranslate }),
            });
            if (trRes.ok) {
              const trData = await trRes.json();
              for (const r of trData.results ?? []) {
                if (r.field === 'noteZh') translatedForm.noteEn = r.translated;
                if (r.field === 'verdictZh') translatedForm.verdictEn = r.translated;
              }
            }
          } catch {
            /* non-blocking */
          }
        }

        const isEdit = editingItemId !== null;
        const url = isEdit ? `/api/uses/items/${editingItemId}` : '/api/uses/items';
        const method = isEdit ? 'PATCH' : 'POST';

        const payload = isEdit
          ? { ...translatedForm, rating: Number(translatedForm.rating) }
          : { ...translatedForm, sectionId, rating: Number(translatedForm.rating) };

        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Request failed');
        }

        toast.success(isEdit ? t('uses.itemUpdated') : t('uses.itemCreated'));
        setShowItemFormFor(null);
        setItemForm(EMPTY_ITEM_FORM);
        setEditingItemId(null);
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : t('common.error'));
      } finally {
        setLoading(false);
      }
    },
    [editingItemId, itemForm, router, t],
  );

  const handleDeleteItem = useCallback(
    async (id: number) => {
      if (!confirm(t('uses.confirmDeleteItem'))) return;
      setLoading(true);
      try {
        const res = await fetch(`/api/uses/items/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Delete failed');
        toast.success(t('uses.itemDeleted'));
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : t('common.error'));
      } finally {
        setLoading(false);
      }
    },
    [router, t],
  );

  /* ── Render helpers ──────────────────────────────────────────── */
  const renderStars = (rating: number | null) => {
    if (!rating) return null;
    return (
      <span className="text-yellow-500">
        {'★'.repeat(rating)}
        {'☆'.repeat(5 - rating)}
      </span>
    );
  };

  const getLangTab = (itemId: number): 'en' | 'zh' => {
    return itemLangTab[itemId] || 'en';
  };

  /* ── Render ──────────────────────────────────────────────────── */
  return (
    <div className="space-y-4">
      {/* New Section Button */}
      <div className="flex justify-end">
        <button
          onClick={openCreateSection}
          disabled={loading}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {t('uses.newSection')}
        </button>
      </div>

      {/* Section Form */}
      {showSectionForm && (
        <form
          onSubmit={handleSectionSubmit}
          className="border-border bg-card space-y-3 rounded-lg border p-4"
        >
          <h3 className="font-semibold">
            {editingSectionId ? t('uses.editSectionTitle') : t('uses.newSectionTitle')}
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="text-muted-foreground mb-1 block text-xs font-medium">
                {t('uses.fieldSectionId')}
              </label>
              <input
                type="text"
                value={sectionForm.sectionId}
                onChange={(e) => setSectionForm({ ...sectionForm, sectionId: e.target.value })}
                placeholder="e.g. hardware"
                className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="text-muted-foreground mb-1 block text-xs font-medium">
                {t('common.sortOrder')}
              </label>
              <input
                type="number"
                value={sectionForm.sortOrder}
                onChange={(e) =>
                  setSectionForm({ ...sectionForm, sortOrder: Number(e.target.value) })
                }
                className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-muted-foreground mb-1 block text-xs font-medium">
                标题（保存时自动翻译英文）
              </label>
              <input
                type="text"
                value={sectionForm.titleZh}
                onChange={(e) => setSectionForm({ ...sectionForm, titleZh: e.target.value })}
                placeholder="硬件"
                className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
                required
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading
                ? t('common.saving')
                : editingSectionId
                  ? t('common.update')
                  : t('common.create')}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowSectionForm(false);
                setEditingSectionId(null);
              }}
              className="border-input hover:bg-accent rounded-md border px-4 py-2 text-sm font-medium"
            >
              {t('common.cancel')}
            </button>
          </div>
        </form>
      )}

      {/* Sections List */}
      {sections.length === 0 && !showSectionForm && (
        <div className="border-border text-muted-foreground rounded-lg border border-dashed p-12 text-center">
          {t('uses.emptySection')}
        </div>
      )}

      {sections.map((section) => {
        const sectionItems = items.filter((i) => i.sectionId === section.id);
        const isCollapsed = collapsedSections.has(section.id);

        return (
          <div key={section.id} className="border-border bg-card overflow-hidden rounded-lg border">
            {/* Section Header */}
            <div className="border-border flex items-center justify-between border-b px-4 py-3">
              <button
                onClick={() => toggleCollapse(section.id)}
                className="flex items-center gap-2 text-left"
              >
                <span className="text-muted-foreground">{isCollapsed ? '▶' : '▼'}</span>
                <div>
                  <span className="font-semibold">{section.titleEn}</span>
                  <span className="text-muted-foreground mx-2">/</span>
                  <span className="text-muted-foreground">{section.titleZh}</span>
                  <span className="bg-muted text-muted-foreground ml-2 rounded px-1.5 py-0.5 text-xs">
                    {section.sectionId}
                  </span>
                  <span className="text-muted-foreground ml-2 text-xs">
                    ({sectionItems.length} items)
                  </span>
                </div>
              </button>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => openEditSection(section)}
                  className="rounded px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950"
                >
                  {t('common.edit')}
                </button>
                <button
                  onClick={() => handleDeleteSection(section.id)}
                  disabled={loading}
                  className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-950"
                >
                  {t('common.delete')}
                </button>
              </div>
            </div>

            {/* Section Body */}
            {!isCollapsed && (
              <div className="space-y-3 p-4">
                {/* Items Table */}
                {sectionItems.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-border text-muted-foreground border-b text-left text-xs">
                          <th className="pr-3 pb-2 font-medium">{t('uses.colName')}</th>
                          <th className="pr-3 pb-2 font-medium">{t('uses.colRating')}</th>
                          <th className="pr-3 pb-2 font-medium">{t('uses.colSince')}</th>
                          <th className="pr-3 pb-2 font-medium">{t('uses.colNoteVerdict')}</th>
                          <th className="pb-2 font-medium">{t('common.actions')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-border divide-y">
                        {sectionItems.map((item) => {
                          const lang = getLangTab(item.id);
                          const note = lang === 'en' ? item.noteEn : item.noteZh;
                          const verdict = lang === 'en' ? item.verdictEn : item.verdictZh;

                          return (
                            <tr key={item.id}>
                              <td className="py-2 pr-3">
                                {item.url ? (
                                  <a
                                    href={item.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline"
                                  >
                                    {item.name}
                                  </a>
                                ) : (
                                  item.name
                                )}
                              </td>
                              <td className="py-2 pr-3">{renderStars(item.rating)}</td>
                              <td className="text-muted-foreground py-2 pr-3">
                                {item.since || '—'}
                              </td>
                              <td className="max-w-xs py-2 pr-3">
                                <div className="mb-1 flex items-center gap-1">
                                  <button
                                    onClick={() =>
                                      setItemLangTab((prev) => ({
                                        ...prev,
                                        [item.id]: 'en',
                                      }))
                                    }
                                    className={`rounded px-1.5 py-0.5 text-xs ${
                                      lang === 'en'
                                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                                        : 'text-muted-foreground hover:bg-muted'
                                    }`}
                                  >
                                    EN
                                  </button>
                                  <button
                                    onClick={() =>
                                      setItemLangTab((prev) => ({
                                        ...prev,
                                        [item.id]: 'zh',
                                      }))
                                    }
                                    className={`rounded px-1.5 py-0.5 text-xs ${
                                      lang === 'zh'
                                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                                        : 'text-muted-foreground hover:bg-muted'
                                    }`}
                                  >
                                    ZH
                                  </button>
                                </div>
                                <p className="text-muted-foreground truncate text-xs">
                                  {note || '—'}
                                </p>
                                {verdict && (
                                  <p className="text-muted-foreground truncate text-xs italic">
                                    {t('uses.verdict')} {verdict}
                                  </p>
                                )}
                              </td>
                              <td className="py-2">
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => openEditItem(item)}
                                    className="rounded px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950"
                                  >
                                    {t('common.edit')}
                                  </button>
                                  <button
                                    onClick={() => handleDeleteItem(item.id)}
                                    disabled={loading}
                                    className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-950"
                                  >
                                    {t('common.delete')}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {sectionItems.length === 0 && showItemFormFor !== section.id && (
                  <p className="text-muted-foreground text-sm">{t('uses.emptyItems')}</p>
                )}

                {/* Item Form */}
                {showItemFormFor === section.id && (
                  <form
                    onSubmit={(e) => handleItemSubmit(e, section.id)}
                    className="border-border bg-background space-y-3 rounded-md border p-4"
                  >
                    <h4 className="text-sm font-semibold">
                      {editingItemId ? t('uses.editItemTitle') : t('uses.newItemTitle')}
                    </h4>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      <div>
                        <label className="text-muted-foreground mb-1 block text-xs font-medium">
                          Name *
                        </label>
                        <input
                          type="text"
                          value={itemForm.name}
                          onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                          className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-muted-foreground mb-1 block text-xs font-medium">
                          URL
                        </label>
                        <input
                          type="url"
                          value={itemForm.url}
                          onChange={(e) => setItemForm({ ...itemForm, url: e.target.value })}
                          className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-muted-foreground mb-1 block text-xs font-medium">
                          Rating (1-5)
                        </label>
                        <select
                          value={itemForm.rating}
                          onChange={(e) =>
                            setItemForm({ ...itemForm, rating: Number(e.target.value) })
                          }
                          className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
                        >
                          {[1, 2, 3, 4, 5].map((v) => (
                            <option key={v} value={v}>
                              {v} — {'★'.repeat(v)}
                              {'☆'.repeat(5 - v)}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-muted-foreground mb-1 block text-xs font-medium">
                          Since (YYYY-MM)
                        </label>
                        <input
                          type="month"
                          value={itemForm.since}
                          onChange={(e) => setItemForm({ ...itemForm, since: e.target.value })}
                          className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-muted-foreground mb-1 block text-xs font-medium">
                          {t('common.sortOrder')}
                        </label>
                        <input
                          type="number"
                          value={itemForm.sortOrder}
                          onChange={(e) =>
                            setItemForm({ ...itemForm, sortOrder: Number(e.target.value) })
                          }
                          className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <label className="text-muted-foreground mb-1 block text-xs font-medium">
                          说明（保存时自动翻译英文）
                        </label>
                        <textarea
                          value={itemForm.noteZh}
                          onChange={(e) => setItemForm({ ...itemForm, noteZh: e.target.value })}
                          rows={2}
                          className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-muted-foreground mb-1 block text-xs font-medium">
                          评价（保存时自动翻译英文）
                        </label>
                        <textarea
                          value={itemForm.verdictZh}
                          onChange={(e) => setItemForm({ ...itemForm, verdictZh: e.target.value })}
                          rows={2}
                          className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={loading}
                        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        {loading
                          ? t('common.saving')
                          : editingItemId
                            ? t('common.update')
                            : t('common.create')}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowItemFormFor(null);
                          setEditingItemId(null);
                        }}
                        className="border-input hover:bg-accent rounded-md border px-4 py-2 text-sm font-medium"
                      >
                        {t('common.cancel')}
                      </button>
                    </div>
                  </form>
                )}

                {/* Add Item Button */}
                {showItemFormFor !== section.id && (
                  <button
                    onClick={() => openCreateItem(section.id)}
                    disabled={loading}
                    className="border-border text-muted-foreground rounded-md border border-dashed px-3 py-2 text-xs hover:border-blue-400 hover:text-blue-600 disabled:opacity-50"
                  >
                    {t('uses.addItem')}
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
