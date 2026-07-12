"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./page.module.css";

type Destination = "lab" | "me";

export default function Landing() {
  const [toast, setToast] = useState("");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  function showUnavailable(destination: Destination) {
    const name = destination === "lab" ? "Lab" : "Me";
    setToast("");
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    requestAnimationFrame(() => setToast(`${name} 仍在构建中，目前请留在此页。`));
    timeoutRef.current = setTimeout(() => setToast(""), 4200);
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <a className={styles.brand} href="#top" aria-label="Codebuff home">
          <span className={styles.brandMark} aria-hidden="true">C/</span>
          <span>codebuff</span>
        </a>
        <div className={styles.headerActions}>
          <nav aria-label="Primary navigation" className={styles.nav} lang="en">
            <button type="button" onClick={() => showUnavailable("lab")}>Lab</button>
            <button type="button" onClick={() => showUnavailable("me")}>Me</button>
          </nav>
        </div>
      </header>

      <main id="top" className={styles.main}>
        <section className={styles.hero} aria-labelledby="landing-title">
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow} lang="en"><span aria-hidden="true">01</span>Frontend engineering · AI-native practice</p>
            <h1 id="landing-title" lang="en">Moving up the stack, without losing the craft.</h1>
            <p className={styles.summary}>这里记录技术写作、可运行的实验，以及当软件开始与 AI 共同构建时浮现出的系统性问题。</p>
            <a className={styles.primaryAction} href="#directions">
              继续探索<span aria-hidden="true">↓</span>
            </a>
          </div>
          <div className={styles.signal} aria-hidden="true">
            <span className={styles.signalOrb} />
            <span className={styles.signalRing} />
            <code>human intent<br />× system judgment<br />× machine leverage</code>
          </div>
          <p className={styles.status}><span aria-hidden="true" />前端工程、架构思考与 AI 原生实践。</p>
        </section>

        <section id="directions" className={styles.directions} aria-label="继续探索">
          <button className={styles.destination} type="button" onClick={() => showUnavailable("lab")}>
            <span className={styles.destinationNumber}>01</span>
            <span className={styles.destinationText}>
              <span className={styles.destinationKind} lang="en">Papers & experiments</span>
              <strong lang="en">Lab</strong>
              <span>技术讲解、架构笔记，以及可交互的前端研究。</span>
            </span>
            <span className={styles.arrow} aria-hidden="true">↗</span>
          </button>
          <button className={styles.destination} type="button" onClick={() => showUnavailable("me")}>
            <span className={styles.destinationNumber}>02</span>
            <span className={styles.destinationText}>
              <span className={styles.destinationKind} lang="en">Background & current focus</span>
              <strong lang="en">Me</strong>
              <span>了解我的工程经历、技术兴趣，以及最近在思考和实践的方向。</span>
            </span>
            <span className={styles.arrow} aria-hidden="true">↗</span>
          </button>
        </section>

        <section className={styles.guide} aria-labelledby="guide-title">
          <div>
            <p className={styles.eyebrow} lang="en"><span aria-hidden="true">03</span>Site guide</p>
            <h2 id="guide-title" lang="en">Start with a question.</h2>
            <p>不确定从哪里开始？站内向导会根据你的问题，帮你找到相关的文章、实验和背景。</p>
          </div>
          <div className={styles.guidePreview} aria-label="Preview, not interactive yet" lang="en">
            <span className={styles.guidePrompt}>What would you like to explore?</span>
            <span className={styles.guideState}><i aria-hidden="true" />Preview · not interactive yet</span>
          </div>
        </section>
      </main>

      <footer className={styles.footer} lang="en"><span>Codebuff / Built as an AI-native product experiment</span><span>© 2026</span></footer>

      <div className={`${styles.toast} ${toast ? styles.toastVisible : ""}`} role="status" aria-live="polite" aria-atomic="true">
        <span aria-hidden="true">↳</span>{toast}
      </div>
    </div>
  );
}
