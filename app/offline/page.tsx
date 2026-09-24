export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-[var(--color-background)] px-4 text-center">
      <div>
        <h1 className="mb-2 font-[var(--font-heading)] text-[var(--text-heading-sm)] font-light text-[var(--color-primary)]">
          You&apos;re offline
        </h1>
        <p className="text-[var(--color-charcoal)]">
          MatruSetu needs a connection to load this page. Reconnect and try again — anything you already had open stays cached.
        </p>
      </div>
    </main>
  );
}
