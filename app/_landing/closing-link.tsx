import Link from "next/link";

const linkClassName =
  "group no-underline transition-[color,background-color] duration-150 ease-[ease] hover:bg-accent-soft hover:text-accent focus-visible:bg-accent-soft focus-visible:text-accent motion-reduce:transition-none";

const contentClassName =
  "grid min-h-60 w-full content-between gap-12 py-[clamp(2rem,4vw,3.25rem)] [@media(max-width:52rem)]:min-h-44 [@media(max-width:52rem)]:max-w-none [@media(max-width:52rem)]:gap-8 [@media(max-width:52rem)]:px-[var(--layout-gutter)] [@media(max-width:52rem)]:py-7";

const sideClassNames = {
  left: {
    link: "",
    content:
      "ml-auto max-w-[calc(var(--layout-max)/2_+_var(--layout-gutter))] pr-[clamp(2rem,4vw,3.25rem)] pl-[var(--layout-gutter)]",
  },
  right: {
    link: "border-l border-border [@media(max-width:52rem)]:border-t [@media(max-width:52rem)]:border-l-0",
    content:
      "mr-auto max-w-[calc(var(--layout-max)/2_+_var(--layout-gutter))] pr-[var(--layout-gutter)] pl-[clamp(2rem,4vw,3.25rem)]",
  },
} as const;

type ClosingLinkProps = {
  description: string;
  href: string;
  index: string;
  side: keyof typeof sideClassNames;
  title: string;
};

export function ClosingLink({
  description,
  href,
  index,
  side,
  title,
}: ClosingLinkProps) {
  const sideClassName = sideClassNames[side];

  return (
    <Link className={`${linkClassName} ${sideClassName.link}`} href={href}>
      <span className={`${contentClassName} ${sideClassName.content}`}>
        <span>
          <span className="block font-mono text-[0.72rem] leading-body tracking-[0.075em] text-accent">
            {index}
          </span>
          <span
            className="mt-[0.85rem] block text-[clamp(2.25rem,4vw,3.65rem)] leading-none font-[560] tracking-[-0.047em] [@media(max-width:40rem)]:text-[2.4rem]"
            lang="en"
          >
            {title}
          </span>
        </span>
        <span className="flex items-end justify-between gap-8">
          <span className="text-base leading-[1.6] text-muted-foreground">
            {description}
          </span>
          <span
            className="shrink-0 font-mono text-[1.35rem] leading-none text-accent transition-transform duration-150 ease-[ease] group-hover:translate-x-1 group-focus-visible:translate-x-1 motion-reduce:transition-none"
            aria-hidden="true"
          >
            →
          </span>
        </span>
      </span>
    </Link>
  );
}
