import type { ReactNode } from "react";

type Fact = {
  term: string;
  description: ReactNode;
  descriptionLang?: string;
};

type FactListProps = {
  facts: readonly Fact[];
};

export function FactList({ facts }: FactListProps) {
  return (
    <dl className="mt-12 mr-0 mb-0 ml-0 grid border-t border-border">
      {facts.map((fact) => (
        <div
          className="grid grid-cols-[8rem_1fr] gap-6 border-b border-border py-4 [@media(max-width:40rem)]:grid-cols-[5rem_minmax(0,1fr)] [@media(max-width:40rem)]:gap-4"
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
