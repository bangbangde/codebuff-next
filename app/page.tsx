import Link from "next/link";
import { labEntries } from "./content";
import styles from "./page.module.css";

export default function Home() {
  return (
    <main>
      <section className={styles.slogan} aria-labelledby="landing-title">
        <p className={styles.kicker}>Frontend engineering · AI era</p>
        <h1 id="landing-title">Think in systems. Build with judgment.</h1>
        <p lang="zh-CN">
          记录前端工程、架构思考与 AI 协作中的真实问题，也保留仍在发生的实验。
        </p>
      </section>

      <div className={styles.content}>
        <section className={styles.section} aria-labelledby="lab-title">
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.index}>01 / Lab</p>
              <h2 id="lab-title">Notes & experiments</h2>
            </div>
            <Link href="/lab" className={styles.sectionLink}>
              View all <span aria-hidden="true">↗</span>
            </Link>
          </div>

          <div className={styles.entryList}>
            {labEntries.map((entry) => (
              <Link
                href={`/lab#${entry.slug}`}
                className={styles.entry}
                key={entry.slug}
              >
                <span className={styles.entryMeta}>{entry.kind}</span>
                <span className={styles.entryTitle}>{entry.title}</span>
                <span className={styles.arrow} aria-hidden="true">
                  →
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section className={styles.section} aria-labelledby="me-title">
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.index}>02 / Me</p>
              <h2 id="me-title">The engineer behind the work</h2>
            </div>
            <Link href="/me" className={styles.sectionLink}>
              About <span aria-hidden="true">↗</span>
            </Link>
          </div>
          <p className={styles.about} lang="zh-CN">
            一名前端工程师，关注复杂系统如何被理解、设计与持续交付。
          </p>
        </section>
      </div>
    </main>
  );
}
