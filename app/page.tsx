import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={styles.page}>
      <section className={styles.panel} aria-labelledby="foundation-title">
        <p className={styles.eyebrow}>Codebuff / UI foundation</p>
        <h1 id="foundation-title" className={styles.title}>
          A quiet base for the work ahead.
        </h1>
        <p className={styles.summary}>
          The shared visual foundation is ready for prototype work. This neutral
          placeholder intentionally represents no product surface.
        </p>

        <dl className={styles.statusList}>
          <div>
            <dt>Foundation</dt>
            <dd>Ready</dd>
          </div>
          <div>
            <dt>Product prototypes</dt>
            <dd>Not started</dd>
          </div>
        </dl>
      </section>
    </main>
  );
}
