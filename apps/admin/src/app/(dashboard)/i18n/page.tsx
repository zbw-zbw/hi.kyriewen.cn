'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';

/* ── Types ───────────────────────────────────────────────────── */
interface I18nMessage {
  id: number;
  locale: string;
  namespace: string;
  key: string;
  value: string;
  updatedAt: string;
}

/* ── Component ───────────────────────────────────────────────── */
export default function I18nPage() {
  const [items, setItems] = useState<I18nMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [locale, setLocale] = useState<'en' | 'zh'>('en');
  const [search, setSearch] = useState('');
  const [editingItem, setEditingItem] = useState<I18nMessage | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ── Fetch items ───────────────────────────────────────────── */
  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/i18n?locale=${locale}`);
      if (!response.ok) throw new Error('Failed to fetch i18n messages');
      const json = await response.json();
      const list = Array.isArray(json) ? json : Array.isArray(json?.data) ? json.data : [];
      setItems(list);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  /* ── Filter items by search ────────────────────────────────── */
  const filteredItems = items.filter((item) => {
    if (!search.trim()) return true;
    const query = search.toLowerCase();
    return (
      item.namespace.toLowerCase().includes(query) ||
      item.key.toLowerCase().includes(query) ||
      item.value.toLowerCase().includes(query)
    );
  });

  /* ── Group by namespace ────────────────────────────────────── */
  const grouped: Record<string, I18nMessage[]> = {};
  for (const item of filteredItems) {
    const list = grouped[item.namespace];
    if (list) {
      list.push(item);
    } else {
      grouped[item.namespace] = [item];
    }
  }

  const namespaces = Object.keys(grouped).sort();

  /* ── Inline edit ───────────────────────────────────────────── */
  const startEdit = (item: I18nMessage) => {
    setEditingItem(item);
    setEditValue(item.value);
  };

  const cancelEdit = () => {
    setEditingItem(null);
    setEditValue('');
  };

  const saveEdit = async () => {
    if (!editingItem) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/i18n/${editingItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: editValue }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Update failed');
      }

      toast.success('Message updated');
      cancelEdit();
      fetchItems();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  /* ── Batch import from JSON ────────────────────────────────── */
  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const json = JSON.parse(text);

      // Expect format: { "namespace": { "key": "value", ... }, ... }
      // or flat: { "key": "value", ... } with namespace derived from filename
      const messages: { namespace: string; key: string; value: string }[] = [];

      if (typeof Object.values(json)[0] === 'object') {
        // Nested: { namespace: { key: value } }
        for (const [namespace, entries] of Object.entries(json)) {
          for (const [key, value] of Object.entries(entries as Record<string, string>)) {
            messages.push({ namespace, key, value: String(value) });
          }
        }
      } else {
        // Flat: { key: value } — use filename without extension as namespace
        const namespace = file.name.replace(/\.json$/i, '');
        for (const [key, value] of Object.entries(json)) {
          messages.push({ namespace, key, value: String(value) });
        }
      }

      if (messages.length === 0) {
        toast.error('No messages found in file');
        return;
      }

      const response = await fetch('/api/i18n/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale, messages }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Import failed');
      }

      const result = await response.json();
      toast.success(`Imported ${result.count ?? messages.length} message(s)`);
      fetchItems();
    } catch (error) {
      if (error instanceof SyntaxError) {
        toast.error('Invalid JSON file');
      } else {
        toast.error(error instanceof Error ? error.message : 'Import failed');
      }
    } finally {
      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  /* ── Render ────────────────────────────────────────────────── */
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">i18n Messages</h2>
        <p className="text-muted-foreground">
          Manage internationalization messages (DB overrides local JSON).
        </p>
      </div>

      <div className="space-y-6">
        {/* ── Controls ─────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Locale switcher */}
          <div className="border-border inline-flex rounded-md border">
            <button
              type="button"
              onClick={() => setLocale('en')}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                locale === 'en' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              } rounded-l-md`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => setLocale('zh')}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                locale === 'zh' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              } rounded-r-md`}
            >
              ZH
            </button>
          </div>

          {/* Search */}
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search namespace, key, or value…"
            className="border-input bg-background focus:ring-ring min-w-[200px] flex-1 rounded-md border px-3 py-1.5 text-sm outline-none focus:ring-2"
          />

          {/* Import button */}
          <label className="border-input hover:bg-accent inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors">
            Import JSON
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />
          </label>

          {/* Count */}
          <span className="text-muted-foreground text-sm">
            {filteredItems.length} message{filteredItems.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* ── Loading state ────────────────────────────────────── */}
        {loading && (
          <div className="text-muted-foreground flex items-center justify-center py-12">
            Loading…
          </div>
        )}

        {/* ── Empty state ──────────────────────────────────────── */}
        {!loading && filteredItems.length === 0 && (
          <div className="border-border text-muted-foreground rounded-lg border border-dashed p-12 text-center">
            {search
              ? 'No messages match your search.'
              : 'No i18n messages yet. Use "Import JSON" to add messages.'}
          </div>
        )}

        {/* ── Grouped tables ───────────────────────────────────── */}
        {!loading &&
          namespaces.map((namespace) => {
            const namespaceItems = grouped[namespace] ?? [];
            return (
              <div key={namespace} className="space-y-2">
                <h3 className="text-muted-foreground text-sm font-semibold tracking-wide uppercase">
                  {namespace}
                  <span className="ml-2 text-xs font-normal normal-case">
                    ({namespaceItems.length})
                  </span>
                </h3>
                <div className="border-border overflow-x-auto rounded-lg border">
                  <table className="w-full text-sm">
                    <thead className="border-border bg-muted/50 border-b">
                      <tr>
                        <th className="w-[30%] px-4 py-2 text-left font-medium">Key</th>
                        <th className="px-4 py-2 text-left font-medium">Value</th>
                        <th className="w-[80px] px-4 py-2 text-right font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-border divide-y">
                      {namespaceItems.map((item) => (
                        <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-2">
                            <span className="bg-muted inline-flex rounded px-2 py-0.5 font-mono text-xs break-all">
                              {item.key}
                            </span>
                          </td>
                          <td className="px-4 py-2">
                            {editingItem?.id === item.id ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={editValue}
                                  onChange={(event) => setEditValue(event.target.value)}
                                  onKeyDown={(event) => {
                                    if (event.key === 'Enter') saveEdit();
                                    if (event.key === 'Escape') cancelEdit();
                                  }}
                                  autoFocus
                                  className="border-input bg-background focus:ring-ring flex-1 rounded-md border px-2 py-1 text-sm outline-none focus:ring-2"
                                />
                                <button
                                  type="button"
                                  onClick={saveEdit}
                                  disabled={saving}
                                  className="bg-primary text-primary-foreground hover:bg-primary/90 rounded px-2 py-1 text-xs font-medium transition-colors disabled:opacity-50"
                                >
                                  {saving ? '…' : 'Save'}
                                </button>
                                <button
                                  type="button"
                                  onClick={cancelEdit}
                                  className="border-input hover:bg-accent rounded border px-2 py-1 text-xs font-medium transition-colors"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <span className="text-muted-foreground break-all">{item.value}</span>
                            )}
                          </td>
                          <td className="px-4 py-2 text-right">
                            {editingItem?.id !== item.id && (
                              <button
                                type="button"
                                onClick={() => startEdit(item)}
                                className="text-primary hover:bg-primary/10 rounded px-2 py-1 text-xs font-medium transition-colors"
                              >
                                Edit
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
