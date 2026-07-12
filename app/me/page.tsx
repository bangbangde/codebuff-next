import type { Metadata } from "next";
import Link from "next/link";
import styles from "../interior.module.css";

export const metadata: Metadata = {
  title: "Me · Codebuff",
  description: "A concise introduction to the engineer behind Codebuff.",
};

export default function MePage() {
  return (
    <main className={styles.page}>
      <Link href="/" className={styles.back}>← Home</Link>
      <p className={styles.eyebrow}>Me / Frontend engineer</p>
      <h1 className={styles.title}>Building beyond the interface.</h1>
      <p className={styles.intro} lang="zh-CN">
        我是一名前端工程师。关注产品理解、系统设计与工程判断，也在持续实践 AI-native 的软件协作方式。
      </p>
      <dl className={styles.facts}>
        <div>
          <dt>Focus</dt>
          <dd>Frontend systems · Architecture · AI collaboration</dd>
        </div>
        <div>
          <dt>Now</dt>
          <dd lang="zh-CN">寻找更清晰、更可靠的软件构建方式。</dd>
        </div>
      </dl>
    </main>
  );
}
