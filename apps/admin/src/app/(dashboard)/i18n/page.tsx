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
  const [zhItems, setZhItems] = useState<I18nMessage[]>([]);
  const [enItems, setEnItems] = useState<I18nMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingItem, setEditingItem] = useState<I18nMessage | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [translatingAll, setTranslatingAll] = useState(false);
  const [translatingIds, setTranslatingIds] = useState<Set<number>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ── Fetch both zh and en items ────────────────────────────── */
  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const [zhRes, enRes, zhJsonRes, enJsonRes] = await Promise.all([
        fetch('/api/i18n?locale=zh'),
        fetch('/api/i18n?locale=en'),
        fetch('/api/i18n/json?locale=zh'),
        fetch('/api/i18n/json?locale=en'),
      ]);
      if (!zhRes.ok) throw new Error('Failed to fetch zh messages');

      const zhJson = await zhRes.json();
      const zhDbList: I18nMessage[] = Array.isArray(zhJson)
        ? zhJson
        : Array.isArray(zhJson?.data)
          ? zhJson.data
          : [];

      // 合并 JSON 文件基础文案和 DB 覆盖文案（DB 优先）
      const zhDbMap = new Map<string, I18nMessage>();
      for (const item of zhDbList) {
        zhDbMap.set(`${item.namespace}::${item.key}`, item);
      }

      // 读取 JSON 文件中的基础文案
      let jsonBaseItems: I18nMessage[] = [];
      if (zhJsonRes.ok) {
        const jsonData = await zhJsonRes.json();
        const flatItems = Array.isArray(jsonData?.data) ? jsonData.data : [];
        // 将 JSON 文案转换为 I18nMessage 格式（id 使用负数以区分于 DB 数据）
        jsonBaseItems = flatItems
          .filter(
            (item: { namespace: string; key: string }) =>
              !zhDbMap.has(`${item.namespace}::${item.key}`),
          )
          .map((item: { namespace: string; key: string; value: string }, index: number) => ({
            id: -(index + 1),
            locale: 'zh',
            namespace: item.namespace,
            key: item.key,
            value: item.value,
            updatedAt: '',
          }));
      }

      setZhItems([...zhDbList, ...jsonBaseItems]);

      // 处理英文文案
      const enDbList: I18nMessage[] = [];
      if (enRes.ok) {
        const enJson = await enRes.json();
        const enList = Array.isArray(enJson)
          ? enJson
          : Array.isArray(enJson?.data)
            ? enJson.data
            : [];
        enDbList.push(...enList);
      }

      // 合并英文 JSON 基础文案
      if (enJsonRes.ok) {
        const enJsonData = await enJsonRes.json();
        const enFlatItems = Array.isArray(enJsonData?.data) ? enJsonData.data : [];
        const enDbMap = new Map<string, boolean>();
        for (const item of enDbList) {
          enDbMap.set(`${item.namespace}::${item.key}`, true);
        }
        const enJsonItems = enFlatItems
          .filter(
            (item: { namespace: string; key: string }) =>
              !enDbMap.has(`${item.namespace}::${item.key}`),
          )
          .map((item: { namespace: string; key: string; value: string }, index: number) => ({
            id: -(index + 1),
            locale: 'en',
            namespace: item.namespace,
            key: item.key,
            value: item.value,
            updatedAt: '',
          }));
        enDbList.push(...enJsonItems);
      }

      setEnItems(enDbList);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  /* ── Build en lookup map ─────────────────────────────────────── */
  const enMap = new Map<string, I18nMessage>();
  for (const item of enItems) {
    enMap.set(`${item.namespace}::${item.key}`, item);
  }

  /* ── Filter zh items by search ─────────────────────────────── */
  const filteredItems = zhItems.filter((item) => {
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

  /* ── Save zh + auto-translate en ───────────────────────────── */
  const saveEdit = async () => {
    if (!editingItem) return;

    setSaving(true);
    try {
      // 1. Save the Chinese value
      // 对于 JSON 基础文案（id < 0），使用 POST（upsert）创建到 DB
      let response: Response;
      if (editingItem.id < 0) {
        response = await fetch('/api/i18n', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            locale: 'zh',
            namespace: editingItem.namespace,
            key: editingItem.key,
            value: editValue,
          }),
        });
      } else {
        response = await fetch(`/api/i18n/${editingItem.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ value: editValue }),
        });
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Update failed');
      }

      toast.success('中文文案已保存，正在翻译英文…');
      cancelEdit();

      // 2. Auto-translate to English
      try {
        const trRes = await fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ texts: [{ text: editValue, type: 'short' }] }),
        });

        if (trRes.ok) {
          const trData = await trRes.json();
          const translated = trData.results?.[0]?.translated;
          if (translated) {
            // 3. Upsert English version
            await fetch('/api/i18n', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                locale: 'en',
                namespace: editingItem.namespace,
                key: editingItem.key,
                value: translated,
              }),
            });
            toast.success('英文翻译已同步');
          }
        }
      } catch {
        toast.error('自动翻译失败，请手动处理英文版本');
      }

      fetchItems();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  /* ── Translate single item ─────────────────────────────────── */
  const translateSingle = async (item: I18nMessage) => {
    setTranslatingIds((prev) => new Set(prev).add(item.id));
    try {
      const trRes = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texts: [{ text: item.value, type: 'short' }] }),
      });

      if (!trRes.ok) throw new Error('Translation failed');

      const trData = await trRes.json();
      const translated = trData.results?.[0]?.translated;
      if (!translated) throw new Error('Empty translation');

      await fetch('/api/i18n', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locale: 'en',
          namespace: item.namespace,
          key: item.key,
          value: translated,
        }),
      });

      toast.success(`"${item.key}" 翻译完成`);
      fetchItems();
    } catch {
      toast.error(`"${item.key}" 翻译失败`);
    } finally {
      setTranslatingIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  };

  /* ── Translate all untranslated items ──────────────────────── */
  const translateAll = async () => {
    const untranslated = zhItems.filter((item) => !enMap.has(`${item.namespace}::${item.key}`));

    if (untranslated.length === 0) {
      toast.success('所有文案已有英文翻译');
      return;
    }

    setTranslatingAll(true);
    let successCount = 0;
    let failCount = 0;

    for (const item of untranslated) {
      try {
        const trRes = await fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ texts: [{ text: item.value, type: 'short' }] }),
        });

        if (!trRes.ok) {
          failCount++;
          continue;
        }

        const trData = await trRes.json();
        const translated = trData.results?.[0]?.translated;
        if (!translated) {
          failCount++;
          continue;
        }

        await fetch('/api/i18n', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            locale: 'en',
            namespace: item.namespace,
            key: item.key,
            value: translated,
          }),
        });
        successCount++;
      } catch {
        failCount++;
      }
    }

    toast.success(`批量翻译完成：${successCount} 成功，${failCount} 失败`);
    setTranslatingAll(false);
    fetchItems();
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
        body: JSON.stringify({ locale: 'zh', messages }),
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

  /* ── Helpers ─────────────────────────────────────────────────── */
  const untranslatedCount = zhItems.filter(
    (item) => !enMap.has(`${item.namespace}::${item.key}`),
  ).length;

  /* ── Render ────────────────────────────────────────────────── */
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">i18n Messages</h2>
        <p className="text-muted-foreground">
          配置中文文案，保存时自动翻译英文（DB overrides local JSON）。
        </p>
      </div>

      <div className="space-y-6">
        {/* ── Controls ─────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="搜索 namespace / key / value…"
            className="border-input bg-background focus:ring-ring min-w-[200px] flex-1 rounded-md border px-3 py-1.5 text-sm outline-none focus:ring-2"
          />

          {/* Translate all */}
          <button
            type="button"
            onClick={translateAll}
            disabled={translatingAll || untranslatedCount === 0}
            className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            {translatingAll ? '翻译中…' : `翻译全部 (${untranslatedCount})`}
          </button>

          {/* Import button */}
          <label className="border-input hover:bg-accent inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors">
            导入 JSON
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />
          </label>

          {/* Count */}
          <span className="text-muted-foreground text-sm">{filteredItems.length} 条文案</span>
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
            {search ? '没有匹配的文案。' : '暂无 i18n 文案，点击"导入 JSON"添加。'}
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
                        <th className="w-[25%] px-4 py-2 text-left font-medium">Key</th>
                        <th className="px-4 py-2 text-left font-medium">中文</th>
                        <th className="w-[80px] px-4 py-2 text-center font-medium">英文</th>
                        <th className="w-[100px] px-4 py-2 text-right font-medium">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-border divide-y">
                      {namespaceItems.map((item) => {
                        const enVersion = enMap.get(`${item.namespace}::${item.key}`);
                        const hasEn = !!enVersion;
                        const isTranslating = translatingIds.has(item.id);

                        return (
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
                                    {saving ? '…' : '保存'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={cancelEdit}
                                    className="border-input hover:bg-accent rounded border px-2 py-1 text-xs font-medium transition-colors"
                                  >
                                    取消
                                  </button>
                                </div>
                              ) : (
                                <span className="text-foreground break-all">{item.value}</span>
                              )}
                            </td>
                            <td className="px-4 py-2 text-center">
                              {hasEn ? (
                                <span
                                  className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                  title={enVersion.value}
                                >
                                  ✓
                                </span>
                              ) : (
                                <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                                  —
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-2 text-right">
                              <div className="inline-flex gap-1">
                                {editingItem?.id !== item.id && (
                                  <button
                                    type="button"
                                    onClick={() => startEdit(item)}
                                    className="text-primary hover:bg-primary/10 rounded px-2 py-1 text-xs font-medium transition-colors"
                                  >
                                    编辑
                                  </button>
                                )}
                                {!hasEn && editingItem?.id !== item.id && (
                                  <button
                                    type="button"
                                    onClick={() => translateSingle(item)}
                                    disabled={isTranslating}
                                    className="rounded px-2 py-1 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-50 disabled:opacity-50 dark:hover:bg-blue-900/20"
                                  >
                                    {isTranslating ? '…' : '翻译'}
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
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
