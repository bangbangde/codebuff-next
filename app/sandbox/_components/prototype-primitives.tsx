import type { ReactNode } from "react";

import styles from "./prototype-primitives.module.css";

type PrototypeSectionProps = {
  children: ReactNode;
  description: string;
  id: string;
  label: string;
  status: string;
  title: string;
};

type PrototypePanelProps = {
  children: ReactNode;
  label: string;
  tone?: "default" | "muted";
};

export function PrototypeSection({
  children,
  description,
  id,
  label,
  status,
  title,
}: PrototypeSectionProps) {
  const titleId = `${id}-title`;

  return (
    <section className={styles.section} aria-labelledby={titleId} id={id}>
      <div className={styles.sectionHeader}>
        <div>
          <p className={styles.label}>{label}</p>
          <h2 className={styles.sectionTitle} id={titleId}>
            {title}
          </h2>
          <p className={styles.description}>{description}</p>
        </div>
        <p className={styles.status}>{status}</p>
      </div>
      {children}
    </section>
  );
}

export function PrototypeGrid({ children }: { children: ReactNode }) {
  return <div className={styles.grid}>{children}</div>;
}

export function PrototypePanel({
  children,
  label,
  tone = "default",
}: PrototypePanelProps) {
  const className =
    tone === "muted"
      ? `${styles.panel} ${styles.panelMuted}`
      : styles.panel;

  return (
    <div className={className}>
      <p className={styles.panelLabel}>{label}</p>
      {children}
    </div>
  );
}
