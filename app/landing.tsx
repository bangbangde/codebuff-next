"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import styles from "./page.module.css";

type Destination = "lab" | "me";
type OutputId = "lab" | "about" | "why" | "status" | "help" | "boundary" | "unknown";

type AgentOutput = {
  id: OutputId;
  label: string;
  title: string;
  body: string;
  note?: string;
};

const bootLines = [
  "[BOOT] optical host initialized",
  "[LINK] local content index connected",
  "[MODEL] offline — not configured",
  "[READY] visitor interface online",
];

const outputs: Record<OutputId, AgentOutput> = {
  lab: {
    id: "lab",
    label: "LAB / PREVIEW",
    title: "先看技术内容。",
    body: "Lab 会收纳技术文章、架构笔记和可运行的前端实验。它还在准备中，但关注点已经很明确。",
    note: "Destination unavailable · remaining on Landing",
  },
  about: {
    id: "about",
    label: "AUTHOR / CONTEXT",
    title: "了解这里背后的人。",
    body: "这个站点由一名前端工程师维护，关注架构、产品理解，以及 AI 如何改变软件工作的方式。",
    note: "Public context only · no private profile data",
  },
  why: {
    id: "why",
    label: "SITE / INTENT",
    title: "为什么建立这个网站？",
    body: "它不是传统作品集，而是一个长期记录技术表达、交互实验和工程判断的空间。Agent 负责帮助访客找到进入这些内容的路径。",
  },
  status: {
    id: "status",
    label: "SYSTEM / STATUS",
    title: "本地界面在线，推理服务离线。",
    body: "当前只运行浏览器内置的固定选项与命令。没有模型、API、检索、持久化或后端连接。",
    note: "Input is processed locally and discarded",
  },
  help: {
    id: "help",
    label: "TERMINAL / HELP",
    title: "可用指令。",
    body: "/home 恢复首页；/lab 查看技术内容；/about 了解作者；/why 查看建站意图；/status 查看能力状态；/clear 清除当前输出。",
    note: "Press / at any time to reopen the command list",
  },
  boundary: {
    id: "boundary",
    label: "MODEL / OFFLINE",
    title: "这个问题暂时无法处理。",
    body: "当前推理服务尚未接入。输入只用于验证终端交互，不会被发送或保存。你可以输入 /help 查看可用操作。",
  },
  unknown: {
    id: "unknown",
    label: "COMMAND / UNKNOWN",
    title: "未识别这个指令。",
    body: "输入 /help 查看当前可用的本地指令。",
  },
};

const commands = [
  { command: "/help", description: "查看所有指令" },
  { command: "/home", description: "恢复初始 Hero" },
  { command: "/lab", description: "查看技术内容说明" },
  { command: "/about", description: "了解作者" },
  { command: "/why", description: "为什么建立本站" },
  { command: "/status", description: "查看当前能力状态" },
  { command: "/clear", description: "清除当前输出" },
] as const;

const terminalChoices = [
  { key: "1", label: "看看技术内容", output: outputs.lab },
  { key: "2", label: "了解作者", output: outputs.about },
  { key: "3", label: "为什么建立这个网站", output: outputs.why },
] as const;

export default function Landing() {
  const [bootStep, setBootStep] = useState(0);
  const [currentOutput, setCurrentOutput] = useState<AgentOutput | null>(null);
  const [query, setQuery] = useState("");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [commandIndex, setCommandIndex] = useState(0);
  const [inputFocused, setInputFocused] = useState(false);
  const [toast, setToast] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ready = bootStep >= bootLines.length;

  const filteredCommands = useMemo(() => {
    if (!query.startsWith("/")) return [];
    const normalized = query.toLowerCase();
    return commands.filter((item) => item.command.startsWith(normalized));
  }, [query]);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
      const timeout = window.setTimeout(() => setBootStep(bootLines.length), 0);
      return () => window.clearTimeout(timeout);
    }

    const interval = window.setInterval(() => {
      setBootStep((step) => {
        if (step >= bootLines.length) {
          window.clearInterval(interval);
          return step;
        }
        return step + 1;
      });
    }, 280);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    function focusTerminal(event: globalThis.KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const editing = target?.matches("input, textarea, select, [contenteditable='true']");
      if (event.key !== "/" || editing || event.metaKey || event.ctrlKey || event.altKey) return;
      event.preventDefault();
      setQuery("/");
      setPaletteOpen(true);
      setCommandIndex(0);
      inputRef.current?.focus();
    }

    window.addEventListener("keydown", focusTerminal);
    return () => window.removeEventListener("keydown", focusTerminal);
  }, []);

  useEffect(() => () => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
  }, []);

  function showUnavailable(destination: Destination) {
    const name = destination === "lab" ? "Lab" : "Me";
    setToast("");
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    requestAnimationFrame(() => setToast(`${name} 仍在构建中，目前请留在此页。`));
    toastTimeoutRef.current = setTimeout(() => setToast(""), 4200);
  }

  function showOutput(output: AgentOutput) {
    setCurrentOutput(output);
    setQuery("");
    setPaletteOpen(false);
    setCommandIndex(0);
  }

  function restoreHome() {
    setCurrentOutput(null);
    setQuery("");
    setPaletteOpen(false);
    setCommandIndex(0);
  }

  function runCommand(command: string) {
    switch (command.toLowerCase()) {
      case "/home":
      case "/clear":
        restoreHome();
        break;
      case "/lab":
        showOutput(outputs.lab);
        break;
      case "/about":
        showOutput(outputs.about);
        break;
      case "/why":
        showOutput(outputs.why);
        break;
      case "/status":
        showOutput(outputs.status);
        break;
      case "/help":
        showOutput(outputs.help);
        break;
      default:
        showOutput(outputs.unknown);
    }
  }

  function processQuery(value: string) {
    const normalizedValue = value.trim();
    if (!normalizedValue) return;
    if (normalizedValue.startsWith("/")) {
      const exactCommand = commands.find((item) => item.command === normalizedValue.toLowerCase());
      runCommand(exactCommand?.command ?? normalizedValue);
      return;
    }
    showOutput(outputs.boundary);
  }

  function submitQuery(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    processQuery(query);
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!paletteOpen || filteredCommands.length === 0) {
      if (event.key === "Escape") {
        setPaletteOpen(false);
      } else if (event.key === "Enter") {
        event.preventDefault();
        processQuery(query);
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setCommandIndex((index) => (index + 1) % filteredCommands.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setCommandIndex((index) => (index - 1 + filteredCommands.length) % filteredCommands.length);
    } else if (event.key === "Escape") {
      event.preventDefault();
      setPaletteOpen(false);
    } else if (event.key === "Enter") {
      event.preventDefault();
      runCommand(filteredCommands[commandIndex].command);
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <a className={styles.brand} href="#top" aria-label="Codebuff home" onClick={restoreHome}>
          <span className={styles.brandMark} aria-hidden="true">C/</span>
          <span>codebuff</span>
        </a>
        <nav aria-label="Primary navigation" className={styles.nav} lang="en">
          <button type="button" onClick={() => showUnavailable("lab")}>Lab</button>
          <button type="button" onClick={() => showUnavailable("me")}>Me</button>
        </nav>
      </header>

      <main id="top" className={styles.main}>
        <section className={styles.workspace} aria-label="Codebuff site host">
          <div className={styles.outputCanvas}>
            {currentOutput ? (
              <article className={styles.output} aria-live="polite" aria-atomic="true" key={currentOutput.id}>
                <p className={styles.eyebrow} lang="en"><span aria-hidden="true">OUT</span>{currentOutput.label}</p>
                <h1>{currentOutput.title}</h1>
                <p className={styles.outputBody}>{currentOutput.body}</p>
                {currentOutput.note && <p className={styles.outputNote} lang="en">{currentOutput.note}</p>}
                <button className={styles.homeAction} type="button" onClick={restoreHome}>
                  <span aria-hidden="true">←</span>返回初始界面
                </button>
              </article>
            ) : (
              <div className={styles.hero}>
                <p className={styles.eyebrow} lang="en"><span aria-hidden="true">01</span>Site host · AI-native practice</p>
                <h1 id="landing-title" lang="en">Moving up the stack, without losing the craft.</h1>
                <p className={styles.heroSummary}>
                  这里记录技术写作、可运行的实验，以及当软件开始与 AI 共同构建时浮现出的系统性问题。
                </p>
                <div className={styles.hostIntro}>
                  <span className={styles.hostIntroLine} aria-hidden="true" />
                  <p>我是 Codebuff 的站内代理，替作者接待访客，并负责解释这里的内容。</p>
                </div>
              </div>
            )}
          </div>

          <aside className={styles.hostColumn} aria-label="Agent and local terminal">
            <div className={`${styles.agentVisual} ${inputFocused ? styles.agentListening : ""} ${currentOutput ? styles.agentResponding : ""}`}>
              <div className={styles.agentIdentity} lang="en">
                <span>CODEBUFF / HOST</span>
                <span>{inputFocused ? "LISTENING" : currentOutput ? "OUTPUT ACTIVE" : "STANDING BY"}</span>
              </div>
              <div className={styles.agentBody} aria-hidden="true">
                <span className={styles.agentCrown} />
                <span className={styles.agentHousing}>
                  <i className={styles.agentOptic}><b /></i>
                  <i className={styles.agentAperture} />
                </span>
                <span className={styles.agentNeck} />
                <span className={styles.agentBase} />
                <span className={styles.agentSignal}>C/</span>
              </div>
            </div>

            <div className={styles.terminal}>
              <div className={styles.terminalHeader} lang="en">
                <span>LOCAL TERMINAL</span>
                <button type="button" onClick={() => setBootStep(bootLines.length)} disabled={ready}>
                  {ready ? "READY" : "SKIP BOOT"}
                </button>
              </div>

              <p className={styles.srOnly} role="status" aria-live="polite">
                {ready ? "站内代理界面已就绪，推理服务离线。" : "站内代理界面正在初始化。"}
              </p>

              <div className={styles.bootLog} aria-hidden="true" lang="en">
                {bootLines.slice(0, bootStep).map((line) => <span key={line}>{line}</span>)}
                {!ready && <span className={styles.bootCursor}>_</span>}
              </div>

              {ready && (
                <div className={styles.terminalControls}>
                  <p className={styles.terminalPrompt}>你想从哪里开始？</p>
                  <div className={styles.terminalChoices}>
                    {terminalChoices.map((choice) => (
                      <button key={choice.key} type="button" onClick={() => showOutput(choice.output)}>
                        <kbd>{choice.key}</kbd><span>{choice.label}</span>
                      </button>
                    ))}
                  </div>

                  <form className={styles.commandForm} onSubmit={submitQuery}>
                    <label className={styles.srOnly} htmlFor="agent-command">向站内代理输入问题或指令</label>
                    <span aria-hidden="true">&gt;</span>
                    <input
                      ref={inputRef}
                      id="agent-command"
                      type="text"
                      value={query}
                      placeholder="输入问题，或按 / 查看指令"
                      autoComplete="off"
                      spellCheck={false}
                      role="combobox"
                      aria-autocomplete="list"
                      aria-expanded={paletteOpen && filteredCommands.length > 0}
                      aria-controls="command-palette"
                      aria-activedescendant={paletteOpen && filteredCommands.length > 0 ? `command-${commandIndex}` : undefined}
                      onFocus={() => setInputFocused(true)}
                      onBlur={() => setInputFocused(false)}
                      onChange={(event) => {
                        const value = event.target.value;
                        setQuery(value);
                        setPaletteOpen(value.startsWith("/"));
                        setCommandIndex(0);
                      }}
                      onKeyDown={handleInputKeyDown}
                    />
                    <button type="submit" aria-label="发送到本地终端">↵</button>
                  </form>

                  {paletteOpen && filteredCommands.length > 0 && (
                    <div id="command-palette" className={styles.commandPalette} role="listbox" aria-label="内置指令">
                      {filteredCommands.map((item, index) => (
                        <button
                          id={`command-${index}`}
                          key={item.command}
                          type="button"
                          role="option"
                          aria-selected={index === commandIndex}
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => runCommand(item.command)}
                        >
                          <code>{item.command}</code><span>{item.description}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  <p className={styles.commandHint} lang="en">PRESS / FOR COMMANDS · INPUT STAYS LOCAL</p>
                </div>
              )}
            </div>
          </aside>
        </section>
      </main>

      <div className={`${styles.toast} ${toast ? styles.toastVisible : ""}`} role="status" aria-live="polite" aria-atomic="true">
        <span aria-hidden="true">↳</span>{toast}
      </div>
    </div>
  );
}
