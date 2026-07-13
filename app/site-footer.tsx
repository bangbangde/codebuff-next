export function SiteFooter() {
  return (
    <footer className="py-8">
      <div className="mx-auto grid w-full max-w-[calc(var(--layout-max)_+_2*var(--layout-gutter))] grid-cols-[1fr_auto_1fr] gap-4 px-[var(--layout-gutter)] font-mono text-xs leading-body text-muted-foreground [@media(max-width:40rem)]:grid-cols-[1fr_auto]">
        <p className="m-0">Codebuff</p>
        <p className="m-0 [@media(max-width:40rem)]:hidden">
          Thinking, building, learning.
        </p>
        <p className="m-0 text-right">© {new Date().getFullYear()}</p>
      </div>
    </footer>
  );
}
