export default function AdminLoading() {
  return (
    <div
      aria-label="正在载入 Admin"
      className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 sm:py-10"
      role="status"
    >
      <div className="h-3 w-28 animate-pulse rounded-full bg-muted motion-reduce:animate-none" />
      <div className="mt-5 h-10 w-full max-w-md animate-pulse rounded-md bg-muted motion-reduce:animate-none" />
      <div className="mt-4 h-5 w-full max-w-2xl animate-pulse rounded-md bg-muted motion-reduce:animate-none" />
      <div className="mt-10 grid gap-4 md:grid-cols-2">
        <div className="h-44 animate-pulse rounded-lg border border-border bg-card motion-reduce:animate-none" />
        <div className="h-44 animate-pulse rounded-lg border border-border bg-card motion-reduce:animate-none" />
      </div>
      <span className="sr-only">正在载入…</span>
    </div>
  );
}
