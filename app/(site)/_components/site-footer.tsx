export function SiteFooter() {
  return (
    <footer className="border-t border-border" lang="en">
      <div className="mx-auto flex min-h-32 w-full max-w-[calc(var(--layout-max)+2*var(--layout-gutter))] items-center justify-between gap-4 px-[var(--layout-gutter)] font-mono text-xs leading-body text-muted-foreground [@media(max-width:40rem)]:min-h-28">
        <p className="m-0 font-sans text-sm font-semibold tracking-[-0.02em] text-foreground">
          CQ’s Lab
        </p>
        <p className="m-0 text-right">© {new Date().getFullYear()} CQ</p>
      </div>
    </footer>
  );
}
