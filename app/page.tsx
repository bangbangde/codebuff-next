import Link from "next/link";
import { labEntries } from "./content";
import styles from "./page.module.css";

export default function Home() {
  return (
    <main id="main-content">
      <section className={styles.slogan} aria-labelledby="landing-title">
        <p className={styles.kicker}>Frontend engineering · AI era</p>
        <h1 id="landing-title">Beyond the frontend.</h1>
        <p lang="zh-CN">
          从前端出发，关注产品如何被理解、系统如何被设计，以及 AI 正在如何改变软件开发
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
              View all <span aria-hidden="true">→</span>
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
              About <span aria-hidden="true">→</span>
            </Link>
          </div>
          <div className={styles.aboutBody}>
            <p className={styles.about} lang="zh-CN">
              一名前端工程师，在 AI 时代探索前端之外的可能
            </p>
            <dl className={styles.aboutFacts}>
              <div>
                <dt>Focus</dt>
                <dd>Frontend systems · Architecture · AI collaboration</dd>
              </div>
              <div>
                <dt>Now</dt>
                <dd lang="zh-CN">寻找更清晰、更可靠的软件构建方式</dd>
              </div>
            </dl>
          </div>
        </section>
      </div>

      <section className={styles.endcap} aria-labelledby="end-title">
        <div className={styles.endMark} aria-hidden="true">
          <span />
        </div>
        <p className={styles.endLabel}>End / for now</p>
        <h2 id="end-title">先到这里</h2>
        <p className={styles.endNote} lang="zh-CN">
          探索还在继续，下次更新见
        </p>
      </section>
    </main>
  );
}
