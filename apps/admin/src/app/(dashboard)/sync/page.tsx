import { SyncCenter } from './sync-center';

export const dynamic = 'force-dynamic';

export default function SyncPage() {
  return (
    <div className="flex h-full flex-col">
      <div className="mb-4">
        <h2 className="text-2xl font-bold tracking-tight">Sync Center</h2>
        <p className="text-muted-foreground">
          Manually trigger cron jobs or view sync status.
        </p>
      </div>
      <SyncCenter />
    </div>
  );
}
