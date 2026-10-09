"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { toast } from "sonner";
import {
  Bold,
  Code,
  Heading2,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListChecks,
  ListOrdered,
  Loader2,
  Quote,
  Strikethrough,
} from "lucide-react";
import rehypeSanitize from "rehype-sanitize";
import { useTheme } from "components/theme-provider";
import "@uiw/react-markdown-preview/markdown.css";

const MarkdownPreview = dynamic(() => import("@uiw/react-markdown-preview"), { ssr: false });

const TASK_LINE = /^[ \t]*[-*][ \t]+\[( |x|X)\][ \t]+.*$/gm;

// Hanya izinkan link http(s), mailto, dan relatif. Skema lain (mis. javascript:) dibuang.
function safeUrl(url: string) {
  const trimmed = url.trim();
  // Browser mengabaikan spasi & karakter kontrol di skema (mis. "java\tscript:"), jadi cek versi yang sudah dibersihkan.
  const compact = trimmed.replace(/[\u0000-\u0020\u007f]+/g, "");
  if (/^(https?:|mailto:)/i.test(compact)) return trimmed;
  if (/^[a-z][a-z0-9+.-]*:/i.test(compact)) return "";
  return trimmed;
}

// Tampilkan Markdown. Baris checklist bisa disembunyikan karena ditampilkan terpisah sebagai daftar interaktif.
export function MarkdownView({ source, hideTasks }: { source: string; hideTasks?: boolean }) {
  const { theme } = useTheme();
  const text = hideTasks ? source.replace(TASK_LINE, "").replace(/\n{3,}/g, "\n\n").trim() : source;
  if (!text.trim()) return null;
  return (
    <div data-color-mode={theme === "dark" ? "dark" : "light"} className="tk-markdown">
      {/* HTML mentah dibersihkan (rehype-sanitize) supaya isi issue/komentar tidak bisa menjalankan script. */}
      <MarkdownPreview source={text} style={{ background: "transparent" }} rehypePlugins={[rehypeSanitize]} urlTransform={safeUrl} />
    </div>
  );
}

async function uploadImage(file: File) {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/upload-ticket", { method: "POST", body: form });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.url) throw new Error(data.error || "Image upload failed");
  return data.url as string;
}

type Action = {
  key: string;
  label: string;
  shortcut?: string;
  icon: React.ComponentType<{ className?: string }>;
  apply: (sel: { before: string; selected: string; after: string }) => { text: string; cursor: [number, number] };
};

// Bungkus teks terpilih, mis. **bold**.
const wrap = (left: string, right = left, placeholder = "text"): Action["apply"] => ({ before, selected, after }) => {
  const inner = selected || placeholder;
  const text = `${before}${left}${inner}${right}${after}`;
  const start = before.length + left.length;
  return { text, cursor: [start, start + inner.length] };
};

// Tambahkan awalan di setiap baris terpilih, mis. "- [ ] ".
const prefix = (make: (i: number) => string, placeholder = "item"): Action["apply"] => ({ before, selected, after }) => {
  const lineStart = before.lastIndexOf("\n") + 1;
  const head = before.slice(0, lineStart);
  const partial = before.slice(lineStart);
  const lines = `${partial}${selected || placeholder}`.split("\n");
  const block = lines.map((l, i) => `${make(i)}${l}`).join("\n");
  const text = `${head}${block}${after}`;
  return { text, cursor: [head.length, head.length + block.length] };
};

const ACTIONS: (Action | "sep")[] = [
  { key: "heading", label: "Heading", icon: Heading2, apply: prefix(() => "## ", "Heading") },
  { key: "bold", label: "Bold", shortcut: "Ctrl+B", icon: Bold, apply: wrap("**") },
  { key: "italic", label: "Italic", shortcut: "Ctrl+I", icon: Italic, apply: wrap("_") },
  { key: "strike", label: "Strikethrough", icon: Strikethrough, apply: wrap("~~") },
  "sep",
  { key: "quote", label: "Quote", icon: Quote, apply: prefix(() => "> ", "quote") },
  { key: "code", label: "Code", icon: Code, apply: ({ before, selected, after }) => (selected.includes("\n") ? wrap("```\n", "\n```", "code")({ before, selected, after }) : wrap("`", "`", "code")({ before, selected, after })) },
  { key: "link", label: "Link", shortcut: "Ctrl+K", icon: Link2, apply: ({ before, selected, after }) => {
      const label = selected || "link text";
      const text = `${before}[${label}](https://)${after}`;
      const start = before.length + label.length + 3;
      return { text, cursor: [start, start + 8] };
    } },
  "sep",
  { key: "ul", label: "Bulleted list", icon: List, apply: prefix(() => "- ") },
  { key: "ol", label: "Numbered list", icon: ListOrdered, apply: prefix((i) => `${i + 1}. `) },
  { key: "task", label: "Checklist", icon: ListChecks, apply: prefix(() => "- [ ] ", "to do") },
];

// Editor Markdown dengan toolbar, tab Write/Preview, dan upload gambar (paste, drop, atau tombol).
export function DescriptionEditor({
  value,
  onChange,
  minRows = 8,
  placeholder = "Describe the issue. Add steps with the checklist button.",
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  minRows?: number;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const [tab, setTab] = useState<"write" | "preview">("write");
  const [uploading, setUploading] = useState(0);
  const [dragging, setDragging] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const latest = useRef(value);
  latest.current = value;

  // Tinggi textarea mengikuti isi.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight + 2}px`;
  }, [value, tab]);

  const run = (action: Action) => {
    const el = textareaRef.current;
    if (!el) return;
    const { selectionStart: s, selectionEnd: e } = el;
    const result = action.apply({ before: value.slice(0, s), selected: value.slice(s, e), after: value.slice(e) });
    onChange(result.text);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(result.cursor[0], result.cursor[1]);
    });
  };

  const insertImages = async (files: File[]) => {
    const images = files.filter((f) => f.type.startsWith("image/"));
    if (!images.length) return;
    setTab("write");
    for (const file of images) {
      const token = `![Uploading ${file.name || "image"}…](uploading-${Date.now()}-${Math.random().toString(36).slice(2, 7)})`;
      const el = textareaRef.current;
      const pos = el ? el.selectionStart : latest.current.length;
      const current = latest.current;
      const needsBreak = pos > 0 && current[pos - 1] !== "\n";
      onChange(`${current.slice(0, pos)}${needsBreak ? "\n" : ""}${token}\n${current.slice(pos)}`);
      setUploading((n) => n + 1);
      try {
        const url = await uploadImage(file);
        onChange(latest.current.replace(token, `![${file.name || "image"}](${url})`));
      } catch (err) {
        onChange(latest.current.replace(`${token}\n`, ""));
        toast.error(err instanceof Error ? err.message : "Image upload failed");
      } finally {
        setUploading((n) => n - 1);
      }
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!(e.ctrlKey || e.metaKey)) return;
    const k = e.key.toLowerCase();
    const action = ACTIONS.find((a): a is Action => a !== "sep" && ((k === "b" && a.key === "bold") || (k === "i" && a.key === "italic") || (k === "k" && a.key === "link")));
    if (action) {
      e.preventDefault();
      run(action);
    }
  };

  return (
    <div
      className={clsx(
        "overflow-hidden rounded-md border bg-tk-surface transition-colors focus-within:border-tk-accent focus-within:ring-2 focus-within:ring-tk-accent/20 dark:bg-tk-dark-surface",
        dragging ? "border-tk-accent ring-2 ring-tk-accent/20" : "border-tk-border dark:border-tk-dark-border"
      )}
      onDragOver={(e) => {
        if (Array.from(e.dataTransfer.items).some((i) => i.type.startsWith("image/"))) {
          e.preventDefault();
          setDragging(true);
        }
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        setDragging(false);
        const files = Array.from(e.dataTransfer.files);
        if (files.some((f) => f.type.startsWith("image/"))) {
          e.preventDefault();
          insertImages(files);
        }
      }}
    >
      {/* Tab + toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-tk-divider bg-tk-subtle/60 px-2 py-1 dark:border-tk-dark-divider dark:bg-tk-dark-subtle/50">
        <div className="flex gap-0.5" role="tablist">
          {(["write", "preview"] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={clsx(
                "rounded-sm px-2.5 py-1 text-sm capitalize",
                tab === t
                  ? "bg-tk-surface font-medium text-tk-text shadow-[0_0_0_1px] shadow-tk-border dark:bg-tk-dark-surface dark:text-tk-dark-text dark:shadow-tk-dark-border"
                  : "text-tk-muted hover:text-tk-text dark:text-tk-dark-muted dark:hover:text-tk-dark-text"
              )}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === "write" && (
          <div className="flex flex-wrap items-center gap-0.5" role="toolbar" aria-label="Formatting">
            {ACTIONS.map((a, i) =>
              a === "sep" ? (
                <span key={`sep-${i}`} className="mx-1 h-4 w-px bg-tk-border dark:bg-tk-dark-border" />
              ) : (
                <button
                  key={a.key}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => run(a)}
                  title={a.shortcut ? `${a.label} (${a.shortcut})` : a.label}
                  aria-label={a.label}
                  className="rounded-sm p-1.5 text-tk-muted hover:bg-tk-surface hover:text-tk-text dark:text-tk-dark-muted dark:hover:bg-tk-dark-surface dark:hover:text-tk-dark-text"
                >
                  <a.icon className="h-4 w-4" />
                </button>
              )
            )}
            <span className="mx-1 h-4 w-px bg-tk-border dark:bg-tk-dark-border" />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              title="Attach image"
              aria-label="Attach image"
              className="rounded-sm p-1.5 text-tk-muted hover:bg-tk-surface hover:text-tk-text dark:text-tk-dark-muted dark:hover:bg-tk-dark-surface dark:hover:text-tk-dark-text"
            >
              <ImagePlus className="h-4 w-4" />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              onChange={(e) => {
                insertImages(Array.from(e.target.files ?? []));
                e.target.value = "";
              }}
            />
          </div>
        )}
      </div>

      {tab === "write" ? (
        <textarea
          ref={textareaRef}
          value={value}
          autoFocus={autoFocus}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          onPaste={(e) => {
            const files = Array.from(e.clipboardData.files);
            if (files.some((f) => f.type.startsWith("image/"))) {
              e.preventDefault();
              insertImages(files);
            }
          }}
          rows={minRows}
          placeholder={placeholder}
          className="block max-h-[60vh] w-full resize-none bg-transparent px-3 py-2.5 font-mono text-[13px] leading-relaxed outline-hidden placeholder:font-sans placeholder:text-tk-faint"
        />
      ) : (
        <div className="min-h-[160px] px-3 py-2.5">
          {value.trim() ? <MarkdownView source={value} /> : <p className="text-sm text-tk-faint">Nothing to preview.</p>}
        </div>
      )}

      <div className="flex items-center justify-between border-t border-tk-divider px-3 py-1.5 text-xs text-tk-faint dark:border-tk-dark-divider">
        <span>Markdown supported · Paste, drop, or attach images</span>
        {uploading > 0 && (
          <span className="inline-flex items-center gap-1 text-tk-accent dark:text-[#5eead4]">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading {uploading} {uploading === 1 ? "image" : "images"}…
          </span>
        )}
      </div>
    </div>
  );
}
