export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface-muted" lang="en">
      <div className="mx-auto grid min-h-32 w-full max-w-[calc(var(--layout-max)_+_2*var(--layout-gutter))] grid-cols-[1fr_auto_1fr] items-center gap-4 px-[var(--layout-gutter)] font-mono text-xs leading-body text-muted-foreground [@media(max-width:40rem)]:min-h-36 [@media(max-width:40rem)]:grid-cols-[1fr_auto] [@media(max-width:40rem)]:py-8">
        <p className="m-0 font-sans text-sm font-semibold tracking-[-0.02em] text-foreground">
          CQ’s Lab
        </p>
        <p className="m-0 tracking-[0.035em] [@media(max-width:40rem)]:col-span-full [@media(max-width:40rem)]:row-start-2">
          thinking · building · learning
        </p>
        <p className="m-0 text-right">© {new Date().getFullYear()} CQ</p>
      </div>
    </footer>
  );
}
