"use client";

// CodeMirror 6 官方包（@codemirror/*，由 Marijn Haverbeke 维护）：
// 编辑器核心、Markdown 语法、unified diff 合并视图。
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import {
  acceptChunk,
  getChunks,
  goToNextChunk,
  goToPreviousChunk,
  rejectChunk,
  unifiedMergeView,
} from "@codemirror/merge";
import { EditorView } from "@codemirror/view";
// 第三方 React 封装：CodeMirror 官方未提供 React 适配，
// @uiw/react-codemirror 是社区维护的事实标准方案。
import CodeMirror from "@uiw/react-codemirror";

// 第三方 UI / React
import {
  CheckCheck,
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  Undo2Icon,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";

// 项目内部模块
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/**
 * unifiedMergeView 的自定义按钮渲染。
 *
 * CodeMirror 要求返回 HTMLElement，因此不能用 React 组件直接渲染；
 * 这里手写 DOM 并套用与 shadcn 风格接近的 tailwind 类。
 * onmousedown 必须用 action（库内部依赖 mousedown 而非 click，
 * 避免编辑器失焦导致的副作用）。
 */
function renderMergeControls(
  type: "accept" | "reject",
  action: (event: MouseEvent) => void,
): HTMLElement {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = cn(
    "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium transition-colors",
    type === "accept"
      ? "bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/25 dark:text-emerald-400"
      : "bg-amber-500/15 text-amber-700 hover:bg-amber-500/25 dark:text-amber-400",
  );
  btn.textContent = type === "accept" ? "保留我的" : "还原服务器";
  btn.onmousedown = action;
  return btn;
}

/**
 * 冲突合并对话框：使用 CodeMirror unifiedMergeView 让用户在 unified
 * diff 视图中编辑、按块 accept/reject，最终把合并后的正文回传给父组件。
 *
 * 关键约束：
 * - 用户只能通过「保存合并结果」按钮关闭；ESC 与外部点击均被阻止，
 *   因为关闭对话框不会解决冲突，反而会让用户陷入"再次保存又冲突"的循环。
 * - 对话框每次打开都重新挂载 CodeMirror（key 变化），确保
 *   unifiedMergeView 的 original 与本地草稿同时刷新。
 */
export function ConflictMergeDialog({
  localDraft,
  onOpenChange,
  onResolve,
  open,
  serverDraft,
}: {
  localDraft: string;
  onOpenChange: (open: boolean) => void;
  onResolve: (mergedBody: string) => void;
  open: boolean;
  serverDraft: string;
}) {
  const editorRef = useRef<EditorView | null>(null);
  const [chunkCount, setChunkCount] = useState(0);
  // 父组件通过 key 强制重挂载整个对话框，因此每次打开都是全新状态，
  // CodeMirror 也会自然重建，无需内部 instanceKey。

  // ⚠️ 必须用 useMemo 缓存 extensions：@uiw/react-codemirror 的 useEffect
  // 依赖 extensions 引用，若每次渲染都新建数组会触发 StateEffect.reconfigure，
  // 导致 unifiedMergeView 重新初始化、originalDoc field 重置回初始 serverDraft，
  // 进而使 accept/reject 操作的效果被清除（表现：点击后 chunkCount 归零但
  // 编辑区删除线不消失，需点两次才生效）。
  const extensions = useMemo(
    () => [
      markdown({ base: markdownLanguage, codeLanguages: languages }),
      EditorView.lineWrapping,
      unifiedMergeView({
        original: serverDraft,
        mergeControls: renderMergeControls,
        allowInlineDiffs: true,
        collapseUnchanged: { margin: 3, minSize: 6 },
      }),
      // setChunkCount 是 useState setter，引用稳定，可安全在闭包中使用
      EditorView.updateListener.of((update) => {
        if (update.docChanged || update.viewportChanged) {
          const result = getChunks(update.state);
          setChunkCount(result?.chunks.length ?? 0);
        }
      }),
    ],
    [serverDraft],
  );

  function refreshChunkCount() {
    const view = editorRef.current;
    if (!view) return;
    const result = getChunks(view.state);
    setChunkCount(result?.chunks.length ?? 0);
  }

  function handleAcceptAll() {
    const view = editorRef.current;
    if (!view) return;
    // accept 只更新 originalDoc field（不改变编辑器文档），但每次 accept 后
    // ChunkField 会基于新 originalDoc 重新计算，chunk 位置可能变化。
    // 因此每次循环都重新获取 chunks，取最后一个操作，避免位置失效。
    let safety = 200;
    while (safety-- > 0) {
      const result = getChunks(view.state);
      if (!result || result.chunks.length === 0) break;
      const last = result.chunks[result.chunks.length - 1];
      if (!acceptChunk(view, last.fromB)) break;
    }
    refreshChunkCount();
  }

  function handleRejectAll() {
    const view = editorRef.current;
    if (!view) return;
    // reject 会改变编辑器文档（用 original 替换 local），位置偏移。
    // 每次循环重新获取 chunks，从后向前操作。
    let safety = 200;
    while (safety-- > 0) {
      const result = getChunks(view.state);
      if (!result || result.chunks.length === 0) break;
      const last = result.chunks[result.chunks.length - 1];
      if (!rejectChunk(view, last.fromB)) break;
    }
    refreshChunkCount();
  }

  function handleNext() {
    const view = editorRef.current;
    if (!view) return;
    goToNextChunk(view);
  }

  function handlePrev() {
    const view = editorRef.current;
    if (!view) return;
    goToPreviousChunk(view);
  }

  function handleConfirm() {
    const view = editorRef.current;
    if (!view) return;
    onResolve(view.state.doc.toString());
  }

  return (
    <Dialog
      disablePointerDismissal
      onOpenChange={(next) => {
        // 受控模式：仅响应父组件的 open 变化，忽略 ESC/外部点击触发的关闭请求。
        // 用户必须通过「保存合并结果」按钮离开对话框。
        if (!next) return;
        onOpenChange(next);
      }}
      open={open}
    >
      <DialogContent
        className="flex h-[85vh] max-w-5xl sm:max-w-5xl md:max-w-5xl lg:max-w-5xl xl:max-w-5xl flex-col gap-3 p-4 sm:p-5"
        showCloseButton={false}
      >
        <DialogHeader>
          <DialogTitle>检测到正文冲突，请合并后保存</DialogTitle>
          <DialogDescription>
            灰色删除线为服务器最新版本，下方插入内容为你的本地草稿。
            点击「保留我的」保留你的修改；点击「还原服务器」恢复为服务器版本。
            也可以直接在编辑器中自由修改。完成后点击「保存合并结果」。
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="inline-flex items-center rounded-md border border-border bg-muted/50 px-2 py-1 text-xs text-muted-foreground">
            剩余差异块: <span className="ml-1 font-medium text-foreground">{chunkCount}</span>
          </span>
          <Button onClick={handlePrev} size="xs" type="button" variant="outline">
            <ChevronUpIcon aria-hidden="true" />
            上一个
          </Button>
          <Button onClick={handleNext} size="xs" type="button" variant="outline">
            <ChevronDownIcon aria-hidden="true" />
            下一个
          </Button>
          <Button onClick={handleAcceptAll} size="xs" type="button" variant="outline">
            <CheckCheck aria-hidden="true" />
            全部保留我的
          </Button>
          <Button onClick={handleRejectAll} size="xs" type="button" variant="outline">
            <Undo2Icon aria-hidden="true" />
            全部还原服务器
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden rounded-md border border-border bg-background">
          <CodeMirror
            basicSetup={{
              highlightActiveLine: true,
              highlightActiveLineGutter: true,
              foldGutter: true,
            }}
            extensions={extensions}
            height="100%"
            onCreateEditor={(view) => {
              editorRef.current = view;
              refreshChunkCount();
            }}
            theme={EditorView.theme({
              "&": {
                backgroundColor: "var(--background)",
                color: "var(--foreground)",
                height: "100%",
              },
              "&.cm-focused": {
                outline: "none",
              },
              ".cm-scroller": {
                fontFamily: "var(--typeface-code)",
              },
              ".cm-content": {
                caretColor: "var(--ring)",
              },
              ".cm-cursor, .cm-dropCursor": {
                borderLeftColor: "var(--ring)",
              },
              "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection":
                {
                  backgroundColor: "var(--brand-accent-soft)",
                },
              ".cm-gutters": {
                backgroundColor: "var(--muted)",
                borderRight: "1px solid var(--border)",
                color: "var(--muted-foreground)",
              },
              ".cm-activeLine": {
                backgroundColor: "var(--accent)",
              },
              ".cm-activeLineGutter": {
                backgroundColor: "var(--accent)",
                color: "var(--accent-foreground)",
              },
              // unifiedMergeView 的差异块样式
              ".cm-deletedChunk": {
                backgroundColor: "color-mix(in oklch, var(--destructive) 8%, transparent)",
                borderRadius: "0.25rem",
                padding: "0.25rem 0.5rem",
                margin: "0.25rem 0",
              },
              ".cm-deletedLine": {
                color: "var(--muted-foreground)",
              },
              ".cm-deletedText": {
                color: "var(--destructive)",
              },
              ".cm-changedLine": {
                backgroundColor:
                  "color-mix(in oklch, var(--brand-accent) 12%, transparent)",
              },
              ".cm-changedText": {
                color: "var(--brand-accent)",
              },
              ".cm-chunkButtons": {
                display: "flex",
                gap: "0.25rem",
                margin: "0.125rem 0",
              },
              ".cm-insertedLine": {
                backgroundColor:
                  "color-mix(in oklch, var(--brand-accent) 8%, transparent)",
              },
            })}
            value={localDraft}
          />
        </div>

        <DialogFooter>
          <Button onClick={handleConfirm} type="button">
            <CheckIcon aria-hidden="true" />
            保存合并结果
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
