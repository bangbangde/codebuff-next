import type { ReactNode } from "react";

type SectionLabelProps = {
  children: ReactNode;
};

export function SectionLabel({ children }: SectionLabelProps) {
  return (
    <p
      className="m-0 font-mono text-[0.8125rem] font-semibold leading-body tracking-label text-accent uppercase"
      lang="en"
    >
      {children}
    </p>
  );
}
