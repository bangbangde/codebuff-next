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
      <p className={styles.eyebrow}>Lab / Selected work</p>
      <h1 className={styles.title}>Notes from the workbench.</h1>
      <p className={styles.intro} lang="zh-CN">
        这里收集工程笔记、界面研究与仍在形成中的技术实验。
      </p>
      <div className={styles.list}>
        {labEntries.map((entry) => (
          <article className={styles.item} id={entry.slug} key={entry.slug}>
            <p className={styles.kind}>{entry.kind}</p>
            <div>
              <h2>{entry.title}</h2>
              <p lang="zh-CN">{entry.summary}</p>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
