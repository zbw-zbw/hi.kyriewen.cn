'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Pencil, Trash2, Plus, Save, X } from 'lucide-react';

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

  function getConfigValue(key: string) {
    return initialConfig.find((c) => c.key === key)?.value ?? '';
  }

  const [updatedAt, setUpdatedAt] = useState(getConfigValue('updated_at'));
  const [buildingEn, setBuildingEn] = useState(
    getConfigValue('currently_building_en'),
  );
  const [buildingZh, setBuildingZh] = useState(
    getConfigValue('currently_building_zh'),
  );
  const [saving, setSaving] = useState(false);
  const [configTab, setConfigTab] = useState<'en' | 'zh'>('en');

  async function handleSaveConfig() {
    setSaving(true);
    try {
      const response = await fetch('/api/now/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updated_at: updatedAt,
          currently_building_en: buildingEn,
          currently_building_zh: buildingZh,
        }),
      });
      if (!response.ok) throw new Error('Failed to save config');
      toast.success('Config saved');
      router.refresh();
    } catch {
      toast.error('Failed to save config');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-lg border border-border bg-background p-6">
      <h3 className="mb-4 text-lg font-semibold">Now Config</h3>

      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Updated At</label>
          <input
            type="text"
            value={updatedAt}
            onChange={(e) => setUpdatedAt(e.target.value)}
            placeholder="e.g. May 2026"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Tab switcher for currently_building */}
        <div>
          <label className="mb-1 block text-sm font-medium">
            Currently Building
          </label>
          <div className="mb-2 flex gap-1 rounded-md border border-border p-1">
            <button
              type="button"
              onClick={() => setConfigTab('en')}
              className={`rounded px-3 py-1 text-sm font-medium transition-colors ${
                configTab === 'en'
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => setConfigTab('zh')}
              className={`rounded px-3 py-1 text-sm font-medium transition-colors ${
                configTab === 'zh'
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              ZH
            </button>
          </div>

          {configTab === 'en' ? (
            <textarea
              value={buildingEn}
              onChange={(e) => setBuildingEn(e.target.value)}
              placeholder="Currently building (English)"
              rows={3}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          ) : (
            <textarea
              value={buildingZh}
              onChange={(e) => setBuildingZh(e.target.value)}
              placeholder="Currently building (中文)"
              rows={3}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          )}
        </div>

        <button
          type="button"
          onClick={handleSaveConfig}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Saving…' : 'Save Config'}
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
  const [tab, setTab] = useState<'en' | 'zh'>('en');

  function update(field: keyof ItemFormData, value: string | number) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit(form);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-md border border-border p-4">
      {/* Language tab */}
      <div className="flex gap-1 rounded-md border border-border p-1">
        <button
          type="button"
          onClick={() => setTab('en')}
          className={`rounded px-3 py-1 text-sm font-medium transition-colors ${
            tab === 'en'
              ? 'bg-foreground text-background'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          EN
        </button>
        <button
          type="button"
          onClick={() => setTab('zh')}
          className={`rounded px-3 py-1 text-sm font-medium transition-colors ${
            tab === 'zh'
              ? 'bg-foreground text-background'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          ZH
        </button>
      </div>

      {tab === 'en' ? (
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium">Label (EN)</label>
            <input
              type="text"
              value={form.labelEn}
              onChange={(e) => update('labelEn', e.target.value)}
              required
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Value (EN)</label>
            <textarea
              value={form.valueEn}
              onChange={(e) => update('valueEn', e.target.value)}
              required
              rows={3}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium">Label (ZH)</label>
            <input
              type="text"
              value={form.labelZh}
              onChange={(e) => update('labelZh', e.target.value)}
              required
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Value (ZH)</label>
            <textarea
              value={form.valueZh}
              onChange={(e) => update('valueZh', e.target.value)}
              required
              rows={3}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
      )}

      <div>
        <label className="mb-1 block text-sm font-medium">Sort Order</label>
        <input
          type="number"
          value={form.sortOrder}
          onChange={(e) => update('sortOrder', Number(e.target.value))}
          className="w-24 rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-2 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {submitting ? 'Saving…' : submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
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

function ItemsSection({ initialItems }: { initialItems: NowItemRow[] }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [itemTab, setItemTab] = useState<'en' | 'zh'>('en');

  async function handleCreate(data: ItemFormData) {
    const response = await fetch('/api/now', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create item');
    toast.success('Item created');
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
    toast.success('Item updated');
    setEditingId(null);
    router.refresh();
  }

  async function handleDelete(itemId: number) {
    if (!confirm('Delete this item?')) return;
    const response = await fetch(`/api/now/${itemId}`, { method: 'DELETE' });
    if (!response.ok) {
      toast.error('Failed to delete item');
      return;
    }
    toast.success('Item deleted');
    router.refresh();
  }

  return (
    <div className="rounded-lg border border-border bg-background p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold">Now Items</h3>
        <div className="flex items-center gap-2">
          {/* List-level language tab */}
          <div className="flex gap-1 rounded-md border border-border p-1">
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
            className="inline-flex items-center gap-1 rounded-md bg-foreground px-3 py-1.5 text-sm font-medium text-background transition-opacity hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            Add Item
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
        <p className="py-8 text-center text-muted-foreground">
          No items yet. Add your first one!
        </p>
      ) : (
        <div className="divide-y divide-border">
          {initialItems.map((item) =>
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
              <div
                key={item.id}
                className="flex items-center justify-between gap-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {itemTab === 'en' ? item.labelEn : item.labelZh}
                    </span>
                    <span className="rounded bg-accent px-1.5 py-0.5 text-xs text-muted-foreground">
                      #{item.sortOrder}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-sm text-muted-foreground">
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
                    className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    title="Edit"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
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
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main NowManager                                                    */
/* ------------------------------------------------------------------ */

export default function NowManager({
  initialItems,
  initialConfig,
}: NowManagerProps) {
  return (
    <div className="space-y-6">
      <ConfigSection initialConfig={initialConfig} />
      <ItemsSection initialItems={initialItems} />
    </div>
  );
}
