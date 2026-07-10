import type { Metadata } from "next";
import Link from "next/link";

import { PrototypeSection } from "./_components/prototype-primitives";
import { experiments } from "./_experiments/registry";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Prototype sandbox | Codebuff",
  description: "An isolated workspace for provisional Codebuff UI experiments.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function SandboxPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.metaRow}>
          <p className={styles.eyebrow}>Codebuff / Prototype sandbox</p>
          <p className={styles.count}>
            {experiments.length} {experiments.length === 1 ? "experiment" : "experiments"}
          </p>
        </div>

        <div className={styles.intro}>
          <div>
            <h1 className={styles.title}>A workspace for provisional ideas.</h1>
            <p className={styles.summary}>
              Everything below is an implementation specimen, not production
              product UI. Experiments share a small set of primitives so their
              differences stay easy to inspect.
            </p>
          </div>

          <Link className={styles.exitLink} href="/">
            Return to project root
          </Link>
        </div>
      </header>

      <div className={styles.experiments} aria-label="Sandbox experiments">
        {experiments.map(
          ({ id, label, status, title, description, Component }) => (
            <PrototypeSection
              key={id}
              id={id}
              label={label}
              status={status}
              title={title}
              description={description}
            >
              <Component />
            </PrototypeSection>
          ),
        )}
      </div>

      <footer className={styles.footer}>
        <p>
          Add, compare, and remove experiments through the colocated registry.
          See <code>app/sandbox/README.md</code> for the conventions.
        </p>
      </footer>
    </main>
  );
}
