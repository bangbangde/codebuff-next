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
  focus: () => void;
  getScroller: () => HTMLElement | null;
}

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
      theme="light"
      value={value}
    />
  );
});
