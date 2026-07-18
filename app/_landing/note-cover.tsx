const backgroundClassNames = [
  "bg-[#f1e7d7] dark:bg-[#30271d]",
  "bg-[#f6d9bd] dark:bg-[#3a281c]",
  "bg-[#e9ece8] dark:bg-[#252a26]",
] as const;

type NoteCoverProps = {
  caption: string;
  index: number;
  lead?: boolean;
};

export function NoteCover({ caption, index, lead = false }: NoteCoverProps) {
  const backgroundClassName = backgroundClassNames[index];

  return (
    <div
      className={`relative isolate overflow-hidden border border-border ${backgroundClassName} ${
        lead
          ? "aspect-[1.28] [@media(max-width:40rem)]:aspect-[1.75]"
          : "aspect-[1.65]"
      }`}
      aria-hidden="true"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/70 via-white/15 to-transparent dark:from-white/5 dark:via-transparent" />
      <p className="absolute top-[6%] left-[5%] z-[2] m-0 font-mono text-[0.6875rem] leading-body tracking-[0.08em] text-muted-foreground uppercase">
        {caption}
      </p>

      {index === 0 ? (
        <>
          <div className="absolute inset-[10%_9%] border border-foreground/20">
            <span className="absolute inset-y-0 left-[32%] w-px bg-foreground/10" />
            <span className="absolute inset-x-0 top-[68%] h-px bg-foreground/10" />
          </div>
          <div className="absolute top-1/2 left-1/2 aspect-square w-[54%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-accent">
            <span className="absolute inset-[15%] rounded-full border border-accent/50" />
            <span className="absolute inset-[31%] rounded-full border border-accent bg-accent" />
          </div>
          <span className="absolute top-[23%] right-[24%] size-4 rounded-full bg-foreground" />
          <span className="absolute right-[14%] bottom-[16%] size-[0.55rem] rounded-full bg-[#ea8a2e]" />
        </>
      ) : null}

      {index === 1 ? (
        <>
          <span className="absolute top-[31%] left-[16%] h-px w-[62%] origin-left rotate-[18deg] bg-foreground" />
          <span className="absolute top-[66%] left-[22%] h-px w-[52%] origin-left -rotate-[14deg] bg-foreground" />
          <span className="absolute top-[24%] left-[14%] size-3 rounded-full border-2 border-foreground bg-background" />
          <span className="absolute top-[44%] right-[18%] size-3 rounded-full border-2 border-accent bg-accent" />
          <span className="absolute right-[24%] bottom-[19%] size-3 rounded-full border-2 border-foreground bg-background" />
          <span className="absolute bottom-[25%] left-[20%] size-3 rounded-full border-2 border-foreground bg-foreground" />
        </>
      ) : null}

      {index === 2 ? (
        <>
          <div className="absolute inset-[13%_10%] border border-foreground/20 bg-background/50" />
          <span className="absolute top-[23%] left-[17%] h-[3px] w-[28%] bg-foreground" />
          <span className="absolute top-[31%] left-[17%] h-0.5 w-[17%] bg-muted-foreground" />
          <span className="absolute right-[17%] bottom-[22%] aspect-square w-[25%] rounded-full border border-accent" />
        </>
      ) : null}

      <p className="absolute right-[5%] bottom-[4%] m-0 font-mono text-[clamp(2.5rem,6vw,5.5rem)] leading-none font-medium tracking-[-0.08em] text-accent/50">
        {String(index + 1).padStart(2, "0")}
      </p>
    </div>
  );
}
