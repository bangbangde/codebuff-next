import type { ReactNode } from "react";

type Fact = {
  term: string;
  description: ReactNode;
  descriptionLang?: string;
};

type FactListProps = {
  facts: readonly Fact[];
  className?: string;
  rowClassName: string;
};

export function FactList({
  facts,
  className = "",
  rowClassName,
}: FactListProps) {
  return (
    <dl
      className={`m-0 grid border-t [border-top-color:var(--border)] ${className}`}
    >
      {facts.map((fact) => (
        <div
          className={`grid border-b [border-bottom-color:var(--border)] py-4 ${rowClassName}`}
          key={fact.term}
        >
          <dt className="m-0 font-mono text-xs leading-body tracking-label text-muted-foreground uppercase">
            {fact.term}
          </dt>
          <dd className="m-0" lang={fact.descriptionLang}>
            {fact.description}
          </dd>
        </div>
      ))}
    </dl>
  );
}
