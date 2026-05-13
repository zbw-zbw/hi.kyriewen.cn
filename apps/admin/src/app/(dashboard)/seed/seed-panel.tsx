'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Database, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAdminLocale } from '@/components/locale-provider';

const SEED_TABLES = [
  { key: 'projects', label: 'Projects', desc: '8 items from projects.ts' },
  { key: 'now', label: 'Now', desc: '3 items + 3 config from now.ts' },
  { key: 'photos', label: 'Photos', desc: '6 items from photos.ts' },
  { key: 'timeline', label: 'Timeline', desc: '8 events from timeline.ts' },
  { key: 'uses', label: 'Uses', desc: '5 sections + 13 items from uses.ts' },
  { key: 'social', label: 'Social Links', desc: '4 links from social.ts' },
  { key: 'popular', label: 'Popular Posts', desc: '1 item from popular.ts' },
  { key: 'navigation', label: 'Navigation', desc: '10 nav items (home, projects, blog…)' },
  { key: 'i18n', label: 'i18n Messages', desc: 'All texts from zh.json + en.json' },
] as const;

type TableKey = (typeof SEED_TABLES)[number]['key'];

export default function SeedPanel() {
  const { t } = useAdminLocale();
  const [selected, setSelected] = useState<Set<TableKey>>(new Set());
  const [pending, startTransition] = useTransition();
  const [results, setResults] = useState<Record<string, number> | null>(null);

  const toggleAll = () => {
    if (selected.size === SEED_TABLES.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(SEED_TABLES.map((table) => table.key)));
    }
  };

  const toggle = (key: TableKey) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleSeed = () => {
    if (selected.size === 0) {
      toast.error(t('seed.selectAtLeastOne'));
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch('/api/seed', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tables: Array.from(selected) }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'Seed failed');
        setResults(data.results);
        toast.success(
          `Imported ${Object.values(data.results as Record<string, number>).reduce((a, b) => a + b, 0)} records`,
        );
      } catch (err) {
        toast.error(String(err));
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Warning */}
      <div className="flex items-start gap-3 rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-4">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-yellow-500" />
        <div className="text-sm">
          <p className="font-medium text-yellow-500">{t('seed.caution')}</p>
          <p className="text-muted-foreground mt-1">{t('seed.cautionDesc')}</p>
        </div>
      </div>

      {/* Select all */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggleAll}
          className="text-primary text-sm font-medium underline-offset-4 hover:underline"
        >
          {selected.size === SEED_TABLES.length ? t('seed.deselectAll') : t('seed.selectAll')}
        </button>
        <span className="text-muted-foreground text-xs">
          {selected.size} / {SEED_TABLES.length} selected
        </span>
      </div>

      {/* Table checkboxes */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SEED_TABLES.map((table) => {
          const isSelected = selected.has(table.key);
          const count = results?.[table.key];
          return (
            <label
              key={table.key}
              className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors ${
                isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
              }`}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggle(table.key)}
                className="border-border mt-0.5 h-4 w-4 rounded"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{table.label}</span>
                  {count !== undefined && (
                    <span className="flex items-center gap-1 text-xs text-green-500">
                      <CheckCircle2 className="h-3 w-3" />
                      {count}
                    </span>
                  )}
                </div>
                <p className="text-muted-foreground mt-0.5 text-xs">{table.desc}</p>
              </div>
            </label>
          );
        })}
      </div>

      {/* Import button */}
      <button
        type="button"
        onClick={handleSeed}
        disabled={pending || selected.size === 0}
        className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
        {pending ? t('seed.importing') : t('seed.importSelected')}
      </button>

      {/* Results */}
      {results && (
        <div className="bg-card rounded-lg border p-4">
          <h3 className="mb-2 text-sm font-medium">{t('seed.importResults')}</h3>
          <div className="space-y-1">
            {Object.entries(results).map(([table, count]) => (
              <div key={table} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{table}</span>
                <span className="font-mono text-green-500">+{count} records</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
