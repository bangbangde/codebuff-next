import type { Metadata } from "next";
import styles from "../interior.module.css";

const principles = [
  {
    label: "Understand",
    description: "从产品目标与使用情境出发，先把真正的问题说清楚",
  },
  {
    label: "Design",
    description: "在体验、技术与长期维护成本之间做有意识的取舍",
  },
  {
    label: "Deliver",
    description: "让方案可以验证、可靠交付，也能在反馈中持续演进",
  },
] as const;

export const metadata: Metadata = {
  title: "Me · Codebuff",
  description: "A concise introduction to the engineer behind Codebuff.",
};

export default function MePage() {
  return (
    <main className={styles.page} id="main-content">
      <section className={styles.meHero} aria-labelledby="me-page-title">
        <p className={styles.eyebrow}>Me / Frontend engineer</p>
        <div className={styles.meLead}>
          <h1 className={styles.title} id="me-page-title">
            Building beyond the interface.
          </h1>
          <div className={styles.meDetails}>
            <p className={styles.intro} lang="zh-CN">
              我是一名前端工程师，关注产品理解、系统设计与工程判断，也在持续实践 AI-native 的软件协作方式
            </p>
            <dl className={styles.facts}>
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
        </div>
      </section>

      <section className={styles.practice} aria-labelledby="practice-title">
        <div className={styles.practiceHeading}>
          <p className={styles.eyebrow}>Practice / Approach</p>
          <h2 id="practice-title">How I approach the work</h2>
        </div>
        <div className={styles.principles}>
          {principles.map((principle, index) => (
            <article className={styles.principle} key={principle.label}>
              <p className={styles.principleIndex}>
                {String(index + 1).padStart(2, "0")}
              </p>
              <h3>{principle.label}</h3>
              <p lang="zh-CN">{principle.description}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
