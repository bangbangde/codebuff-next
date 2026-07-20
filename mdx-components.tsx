import type { MDXComponents } from "mdx/types";
import type { ComponentPropsWithoutRef } from "react";

const components = {
  h2: ({ className = "", ...props }: ComponentPropsWithoutRef<"h2">) => (
    <h2
      className={`mt-14 mb-5 scroll-mt-28 text-[clamp(1.65rem,4vw,2.25rem)] leading-[1.18] font-[560] tracking-[-0.035em] ${className}`}
      {...props}
    />
  ),
  h3: ({ className = "", ...props }: ComponentPropsWithoutRef<"h3">) => (
    <h3
      className={`mt-10 mb-4 scroll-mt-28 text-[1.3rem] leading-[1.3] font-[560] tracking-[-0.02em] ${className}`}
      {...props}
    />
  ),
  p: ({ className = "", ...props }: ComponentPropsWithoutRef<"p">) => (
    <p
      className={`my-6 text-[1.04rem] leading-[1.9] text-foreground [@media(max-width:40rem)]:text-base [@media(max-width:40rem)]:leading-[1.8] ${className}`}
      {...props}
    />
  ),
  a: ({ className = "", ...props }: ComponentPropsWithoutRef<"a">) => (
    <a
      className={`text-accent underline decoration-[color-mix(in_srgb,var(--accent)_35%,transparent)] underline-offset-4 transition-colors duration-150 hover:decoration-accent focus-visible:decoration-accent motion-reduce:transition-none ${className}`}
      {...props}
    />
  ),
  strong: ({ className = "", ...props }: ComponentPropsWithoutRef<"strong">) => (
    <strong className={`font-[620] ${className}`} {...props} />
  ),
  ul: ({ className = "", ...props }: ComponentPropsWithoutRef<"ul">) => (
    <ul
      className={`my-6 list-disc space-y-3 pl-6 text-[1.04rem] leading-[1.8] marker:text-accent [@media(max-width:40rem)]:text-base ${className}`}
      {...props}
    />
  ),
  ol: ({ className = "", ...props }: ComponentPropsWithoutRef<"ol">) => (
    <ol
      className={`my-6 list-decimal space-y-3 pl-6 text-[1.04rem] leading-[1.8] marker:font-mono marker:text-accent [@media(max-width:40rem)]:text-base ${className}`}
      {...props}
    />
  ),
  li: ({ className = "", ...props }: ComponentPropsWithoutRef<"li">) => (
    <li className={`pl-2 ${className}`} {...props} />
  ),
  blockquote: ({
    className = "",
    ...props
  }: ComponentPropsWithoutRef<"blockquote">) => (
    <blockquote
      className={`my-10 border-l-2 border-accent bg-surface-muted px-6 py-1 text-muted-foreground [&>p]:text-inherit ${className}`}
      {...props}
    />
  ),
  code: ({ className = "", ...props }: ComponentPropsWithoutRef<"code">) => (
    <code
      className={`rounded-[0.2rem] bg-accent-soft px-[0.3em] py-[0.12em] font-mono text-[0.88em] text-foreground ${className}`}
      {...props}
    />
  ),
  pre: ({ className = "", ...props }: ComponentPropsWithoutRef<"pre">) => (
    <pre
      className={`my-8 overflow-x-auto border border-border bg-foreground p-5 font-mono text-sm leading-[1.7] text-background [tab-size:2] [&_code]:bg-transparent [&_code]:p-0 [&_code]:text-inherit ${className}`}
      {...props}
    />
  ),
  hr: ({ className = "", ...props }: ComponentPropsWithoutRef<"hr">) => (
    <hr className={`my-14 border-0 border-t border-border ${className}`} {...props} />
  ),
} satisfies MDXComponents;

export function useMDXComponents(): MDXComponents {
  return components;
}
