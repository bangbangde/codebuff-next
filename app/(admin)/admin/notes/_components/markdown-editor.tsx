"use client";

import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import { EditorSelection, type SelectionRange } from "@codemirror/state";
import CodeMirror from "@uiw/react-codemirror";
import { EditorView } from "@codemirror/view";
import {
  forwardRef,
  useImperativeHandle,
  useRef,
} from "react";

export interface NoteMarkdownEditorHandle {
  insertText: (text: string) => void;
  replaceText: (search: string, replacement: string) => boolean;
  focus: () => void;
  getScroller: () => HTMLElement | null;
}

const semanticEditorTheme = EditorView.theme({
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
  ".cm-foldPlaceholder": {
    backgroundColor: "var(--muted)",
    borderColor: "var(--border)",
    color: "var(--muted-foreground)",
  },
});

export const NoteMarkdownEditor = forwardRef<
  NoteMarkdownEditorHandle,
  {
    value: string;
    onChange?: (value: string) => void;
  }
>(function NoteMarkdownEditor({ value, onChange }, ref) {
  const viewRef = useRef<EditorView | null>(null);

  useImperativeHandle(ref, () => ({
    insertText(text: string) {
      const view = viewRef.current;

      if (!view) {
        return;
      }

      const state = view.state;
      const changes = state.changeByRange((range: SelectionRange) => {
        const before = range.from;
        const needsLeadingBreak =
          before > 0 && state.doc.slice(before - 1, before).toString() !== "\n";
        const insertion = `${needsLeadingBreak ? "\n\n" : ""}${text}\n\n`;

        return {
          changes: { from: range.from, to: range.to, insert: insertion },
          range: EditorSelection.cursor(range.from + insertion.length),
        };
      });

      view.dispatch(changes);
      view.focus();

      if (onChange) {
        onChange(view.state.doc.toString());
      }
    },
    replaceText(search: string, replacement: string): boolean {
      const view = viewRef.current;
      if (!view) {
        return false;
      }

      const text = view.state.doc.toString();
      const changes: { from: number; to: number; insert: string }[] = [];
      let pos = 0;
      while (true) {
        const index = text.indexOf(search, pos);
        if (index === -1) {
          break;
        }
        changes.push({
          from: index,
          to: index + search.length,
          insert: replacement,
        });
        pos = index + search.length;
      }

      if (changes.length === 0) {
        return false;
      }

      view.dispatch({ changes });

      if (onChange) {
        onChange(view.state.doc.toString());
      }

      return true;
    },
    focus() {
      viewRef.current?.focus();
    },
    getScroller() {
      return viewRef.current?.scrollDOM ?? null;
    },
  }));

  return (
    <CodeMirror
      basicSetup={{
        highlightActiveLine: true,
        highlightActiveLineGutter: true,
        foldGutter: true,
      }}
      className="h-full"
      extensions={[
        markdown({ base: markdownLanguage, codeLanguages: languages }),
        EditorView.lineWrapping,
      ]}
      height="100%"
      onChange={onChange}
      onCreateEditor={(view) => {
        viewRef.current = view;
      }}
      theme={semanticEditorTheme}
      value={value}
    />
  );
});
