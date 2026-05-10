import SeedPanel from './seed-panel';

export default function SeedPage() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Seed Data</h2>
        <p className="text-muted-foreground">
          Import data from local content files into the database.
        </p>
      </div>
      <SeedPanel />
    </div>
  );
}
