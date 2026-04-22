"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Link as LinkIcon, List, ListOrdered, Highlighter, Palette,
} from "lucide-react";
import { useEffect, useRef } from "react";

interface TipTapEditorProps {
  content: string;
  onChange: (html: string) => void;
}

export function TipTapEditor({ content, onChange }: TipTapEditorProps) {
  const colorRef = useRef<HTMLInputElement>(null);
  const highlightRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      Link.configure({ openOnClick: false }),
      Underline,
    ],
    content,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class:
          "min-h-[120px] p-3 text-sm text-zinc-100 focus:outline-none prose-invert",
      },
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content, { emitUpdate: false });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content]);

  if (!editor) return null;

  const addLink = () => {
    const url = window.prompt("Enter URL:");
    if (!url) return;
    editor.chain().focus().extendMarkRange("link").setLink({ href: url, target: "_blank" }).run();
  };

  const btn = (active: boolean) =>
    `p-1.5 rounded text-xs transition-colors ${
      active
        ? "bg-indigo-600 text-white"
        : "text-zinc-400 hover:text-white hover:bg-zinc-700"
    }`;

  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-800 overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-zinc-700 bg-zinc-900">
        <button type="button" className={btn(editor.isActive("bold"))} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold">
          <Bold className="h-3.5 w-3.5" />
        </button>
        <button type="button" className={btn(editor.isActive("italic"))} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic">
          <Italic className="h-3.5 w-3.5" />
        </button>
        <button type="button" className={btn(editor.isActive("underline"))} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Underline">
          <UnderlineIcon className="h-3.5 w-3.5" />
        </button>
        <button type="button" className={btn(editor.isActive("strike"))} onClick={() => editor.chain().focus().toggleStrike().run()} title="Strikethrough">
          <Strikethrough className="h-3.5 w-3.5" />
        </button>

        <span className="w-px h-4 bg-zinc-700 mx-1" />

        {/* Text color */}
        <div className="relative" title="Text color">
          <button type="button" className={btn(false)} onClick={() => colorRef.current?.click()}>
            <Palette className="h-3.5 w-3.5" />
          </button>
          <input
            ref={colorRef}
            type="color"
            className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
            onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
          />
        </div>

        {/* Highlight */}
        <div className="relative" title="Highlight">
          <button type="button" className={btn(editor.isActive("highlight"))} onClick={() => highlightRef.current?.click()}>
            <Highlighter className="h-3.5 w-3.5" />
          </button>
          <input
            ref={highlightRef}
            type="color"
            className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
            onChange={(e) =>
              editor.chain().focus().setHighlight({ color: e.target.value }).run()
            }
          />
        </div>

        <span className="w-px h-4 bg-zinc-700 mx-1" />

        <button type="button" className={btn(editor.isActive("link"))} onClick={addLink} title="Add link">
          <LinkIcon className="h-3.5 w-3.5" />
        </button>

        <span className="w-px h-4 bg-zinc-700 mx-1" />

        <button type="button" className={btn(editor.isActive("bulletList"))} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet list">
          <List className="h-3.5 w-3.5" />
        </button>
        <button type="button" className={btn(editor.isActive("orderedList"))} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Numbered list">
          <ListOrdered className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Editor */}
      <EditorContent editor={editor} />
    </div>
  );
}
