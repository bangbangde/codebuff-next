import type { Metadata } from "next";
import { labEntries } from "../content";
import styles from "../interior.module.css";

export const metadata: Metadata = {
  title: "Lab · Codebuff",
  description: "Engineering notes and frontend experiments.",
};

export default function LabPage() {
  return (
    <main className={styles.page} id="main-content">
      <section className={styles.pageHeader} aria-labelledby="lab-page-title">
        <p className={styles.eyebrow}>Lab / Selected work</p>
        <h1 className={styles.title} id="lab-page-title">
          Notes from the workbench.
        </h1>
        <p className={styles.intro} lang="zh-CN">
          这里收集工程笔记、界面研究与仍在形成中的技术实验
        </p>
      </section>
      <section className={styles.list} aria-label="Selected Lab entries">
        {labEntries.map((entry, index) => (
          <article className={styles.item} id={entry.slug} key={entry.slug}>
            <p className={styles.kind}>
              {String(index + 1).padStart(2, "0")} / {entry.kind}
            </p>
            <div>
              <h2>{entry.title}</h2>
              <p lang="zh-CN">{entry.summary}</p>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
