import type { ReactNode } from "react";

export function ContentContainer({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`mx-auto w-full max-w-[calc(var(--layout-max)+2*var(--layout-gutter))] px-(--layout-gutter) ${className}`}
    >
      {children}
    </div>
  );
}
