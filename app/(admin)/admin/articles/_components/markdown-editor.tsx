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

export interface MarkdownEditorHandle {
  insertText: (text: string) => void;
  focus: () => void;
}

export const MarkdownEditor = forwardRef<
  MarkdownEditorHandle,
  {
    defaultValue: string;
    onChange?: (value: string) => void;
  }
>(function MarkdownEditor({ defaultValue, onChange }, ref) {
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
  }));

  return (
    <CodeMirror
      basicSetup={{
        highlightActiveLine: true,
        highlightActiveLineGutter: true,
        foldGutter: true,
      }}
      defaultValue={defaultValue}
      extensions={[
        markdown({ base: markdownLanguage, codeLanguages: languages }),
        EditorView.lineWrapping,
      ]}
      onChange={onChange}
      onCreateEditor={(view) => {
        viewRef.current = view;
      }}
      theme="light"
    />
  );
});
