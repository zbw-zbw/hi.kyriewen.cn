'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Pencil, Trash2, Plus, Save, X } from 'lucide-react';
import { useAdminLocale } from '@/components/locale-provider';

interface NowItemRow {
  id: number;
  labelEn: string;
  labelZh: string;
  valueEn: string;
  valueZh: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface NowConfigRow {
  id: number;
  key: string;
  value: string;
  updatedAt: string;
}

interface NowManagerProps {
  initialItems: NowItemRow[];
  initialConfig: NowConfigRow[];
}

/* ------------------------------------------------------------------ */
/*  Config Section                                                     */
/* ------------------------------------------------------------------ */

function ConfigSection({ initialConfig }: { initialConfig: NowConfigRow[] }) {
  const router = useRouter();
  const { t } = useAdminLocale();

  function getConfigValue(key: string) {
    return initialConfig.find((c) => c.key === key)?.value ?? '';
  }

  const [updatedAt, setUpdatedAt] = useState(getConfigValue('updated_at'));
  const [buildingEn, setBuildingEn] = useState(getConfigValue('currently_building_en'));
  const [buildingZh, setBuildingZh] = useState(getConfigValue('currently_building_zh'));
  const [saving, setSaving] = useState(false);

  async function handleSaveConfig() {
    setSaving(true);
    try {
      // Auto-translate buildingZh → buildingEn
      let enValue = buildingEn;
      if (buildingZh.trim()) {
        try {
          const trRes = await fetch('/api/translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ texts: [{ text: buildingZh.trim(), type: 'description' }] }),
          });
          if (trRes.ok) {
            const trData = await trRes.json();
            const translated = trData.results?.[0]?.translated;
            if (translated) {
              enValue = translated;
              setBuildingEn(translated);
            }
          }
        } catch {
          /* non-blocking */
        }
      }

      const response = await fetch('/api/now/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updated_at: updatedAt,
          currently_building_en: enValue,
          currently_building_zh: buildingZh,
        }),
      });
      if (!response.ok) throw new Error('Failed to save config');
      toast.success(t('now.configSaved'));
      router.refresh();
    } catch {
      toast.error(t('now.configSaveFailed'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="border-border bg-background rounded-lg border p-6">
      <h3 className="mb-4 text-lg font-semibold">{t('now.configTitle')}</h3>

      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">{t('now.fieldUpdatedAt')}</label>
          <input
            type="text"
            value={updatedAt}
            onChange={(e) => setUpdatedAt(e.target.value)}
            placeholder="e.g. May 2026"
            className="border-border bg-background focus:ring-ring w-full rounded-md border px-3 py-2 text-sm focus:ring-2 focus:outline-none"
          />
        </div>

        {/* Currently Building (ZH only, auto-translate EN on save) */}
        <div>
          <label className="mb-1 block text-sm font-medium">正在做的事（保存时自动翻译英文）</label>
          <textarea
            value={buildingZh}
            onChange={(e) => setBuildingZh(e.target.value)}
            placeholder="正在做什么…"
            rows={3}
            className="border-border bg-background focus:ring-ring w-full rounded-md border px-3 py-2 text-sm focus:ring-2 focus:outline-none"
          />
        </div>

        <button
          type="button"
          onClick={handleSaveConfig}
          disabled={saving}
          className="bg-foreground text-background inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {saving ? t('common.saving') : t('now.saveConfig')}
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Item Form                                                          */
/* ------------------------------------------------------------------ */

interface ItemFormData {
  labelEn: string;
  labelZh: string;
  valueEn: string;
  valueZh: string;
  sortOrder: number;
}

const EMPTY_FORM: ItemFormData = {
  labelEn: '',
  labelZh: '',
  valueEn: '',
  valueZh: '',
  sortOrder: 0,
};

function ItemForm({
  initial,
  onSubmit,
  onCancel,
  submitLabel,
}: {
  initial: ItemFormData;
  onSubmit: (data: ItemFormData) => Promise<void>;
  onCancel: () => void;
  submitLabel: string;
}) {
  const [form, setForm] = useState<ItemFormData>(initial);
  const [submitting, setSubmitting] = useState(false);

  function update(field: keyof ItemFormData, value: string | number) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      // Auto-translate zh → en before submit
      const updated = { ...form };
      if (form.labelZh.trim() || form.valueZh.trim()) {
        try {
          const texts = [
            ...(form.labelZh.trim()
              ? [{ text: form.labelZh.trim(), type: 'title', field: 'labelZh' }]
              : []),
            ...(form.valueZh.trim()
              ? [{ text: form.valueZh.trim(), type: 'short', field: 'valueZh' }]
              : []),
          ];
          const trRes = await fetch('/api/translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ texts }),
          });
          if (trRes.ok) {
            const trData = await trRes.json();
            for (const r of trData.results ?? []) {
              if (r.field === 'labelZh') updated.labelEn = r.translated;
              if (r.field === 'valueZh') updated.valueEn = r.translated;
            }
          }
        } catch {
          /* non-blocking */
        }
      }
      await onSubmit(updated);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="border-border space-y-4 rounded-md border p-4">
      {/* ZH only — auto-translate EN on save */}
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-sm font-medium">标签（保存时自动翻译英文）</label>
          <input
            type="text"
            value={form.labelZh}
            onChange={(e) => update('labelZh', e.target.value)}
            required
            placeholder="中文标签"
            className="border-border bg-background focus:ring-ring w-full rounded-md border px-3 py-2 text-sm focus:ring-2 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">内容</label>
          <textarea
            value={form.valueZh}
            onChange={(e) => update('valueZh', e.target.value)}
            required
            rows={3}
            placeholder="中文内容"
            className="border-border bg-background focus:ring-ring w-full rounded-md border px-3 py-2 text-sm focus:ring-2 focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Sort Order</label>
        <input
          type="number"
          value={form.sortOrder}
          onChange={(e) => update('sortOrder', Number(e.target.value))}
          className="border-border bg-background focus:ring-ring w-24 rounded-md border px-3 py-2 text-sm focus:ring-2 focus:outline-none"
        />
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="bg-foreground text-background inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {submitting ? 'Saving…' : submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="border-border hover:bg-accent inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition-colors"
        >
          <X className="h-4 w-4" />
          Cancel
        </button>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/*  Items Section                                                      */
/* ------------------------------------------------------------------ */

const ITEMS_PAGE_SIZE = 20;

function ItemsSection({ initialItems }: { initialItems: NowItemRow[] }) {
  const router = useRouter();
  const { locale, t } = useAdminLocale();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [itemTab, setItemTab] = useState<'en' | 'zh'>(locale);
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(initialItems.length / ITEMS_PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedItems = initialItems.slice(
    (safePage - 1) * ITEMS_PAGE_SIZE,
    safePage * ITEMS_PAGE_SIZE,
  );

  async function handleCreate(data: ItemFormData) {
    const response = await fetch('/api/now', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create item');
    toast.success(t('now.itemCreated'));
    setShowAddForm(false);
    router.refresh();
  }

  async function handleUpdate(itemId: number, data: ItemFormData) {
    const response = await fetch(`/api/now/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update item');
    toast.success(t('now.itemUpdated'));
    setEditingId(null);
    router.refresh();
  }

  async function handleDelete(itemId: number) {
    if (!confirm(t('now.confirmDelete'))) return;
    const response = await fetch(`/api/now/${itemId}`, { method: 'DELETE' });
    if (!response.ok) {
      toast.error(t('now.deleteFailed'));
      return;
    }
    toast.success(t('now.itemDeleted'));
    router.refresh();
  }

  return (
    <div className="border-border bg-background rounded-lg border p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold">{t('now.itemsTitle')}</h3>
        <div className="flex items-center gap-2">
          {/* List-level language tab */}
          <div className="border-border flex gap-1 rounded-md border p-1">
            <button
              type="button"
              onClick={() => setItemTab('en')}
              className={`rounded px-2 py-0.5 text-xs font-medium transition-colors ${
                itemTab === 'en'
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => setItemTab('zh')}
              className={`rounded px-2 py-0.5 text-xs font-medium transition-colors ${
                itemTab === 'zh'
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              ZH
            </button>
          </div>
          <button
            type="button"
            onClick={() => {
              setShowAddForm(true);
              setEditingId(null);
            }}
            className="bg-foreground text-background inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium transition-opacity hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            {t('now.addItem')}
          </button>
        </div>
      </div>

      {showAddForm && (
        <div className="mb-4">
          <ItemForm
            initial={EMPTY_FORM}
            onSubmit={handleCreate}
            onCancel={() => setShowAddForm(false)}
            submitLabel="Create"
          />
        </div>
      )}

      {initialItems.length === 0 ? (
        <p className="text-muted-foreground py-8 text-center">{t('now.emptyItems')}</p>
      ) : (
        <div className="divide-border divide-y">
          {paginatedItems.map((item) =>
            editingId === item.id ? (
              <div key={item.id} className="py-4">
                <ItemForm
                  initial={{
                    labelEn: item.labelEn,
                    labelZh: item.labelZh,
                    valueEn: item.valueEn,
                    valueZh: item.valueZh,
                    sortOrder: item.sortOrder,
                  }}
                  onSubmit={(data) => handleUpdate(item.id, data)}
                  onCancel={() => setEditingId(null)}
                  submitLabel="Update"
                />
              </div>
            ) : (
              <div key={item.id} className="flex items-center justify-between gap-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {itemTab === 'en' ? item.labelEn : item.labelZh}
                    </span>
                    <span className="bg-accent text-muted-foreground rounded px-1.5 py-0.5 text-xs">
                      #{item.sortOrder}
                    </span>
                  </div>
                  <p className="text-muted-foreground mt-0.5 truncate text-sm">
                    {itemTab === 'en' ? item.valueEn : item.valueZh}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(item.id);
                      setShowAddForm(false);
                    }}
                    className="text-muted-foreground hover:bg-accent hover:text-foreground rounded-md p-2 transition-colors"
                    title="Edit"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-md p-2 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ),
          )}
        </div>
      )}

      {/* Pagination */}
      {initialItems.length > ITEMS_PAGE_SIZE && (
        <div className="border-border mt-4 flex items-center justify-between border-t pt-3">
          <span className="text-muted-foreground text-sm">
            Page {safePage} of {totalPages} · {initialItems.length} items
          </span>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              className="border-border hover:bg-accent rounded-md border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-40"
            >
              {t('common.prev')}
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
              className="border-border hover:bg-accent rounded-md border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-40"
            >
              {t('common.next')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main NowManager                                                    */
/* ------------------------------------------------------------------ */

export default function NowManager({ initialItems, initialConfig }: NowManagerProps) {
  return (
    <div className="space-y-6">
      <ConfigSection initialConfig={initialConfig} />
      <ItemsSection initialItems={initialItems} />
    </div>
  );
}
