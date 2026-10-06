"use client";

import { useRef, useState } from "react";
import { FileText, Image as ImageIcon, UploadCloud, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { acceptAttribute, formatBytes, MAX_FILES, validateFile } from "@/lib/requests/options";
import { cn } from "@/lib/utils";

export function FilePicker({ files, onChange }: { files: File[]; onChange: (files: File[]) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  function add(list: FileList | null) {
    if (!list) return;
    const errs: string[] = [];
    const next = [...files];
    for (const f of Array.from(list)) {
      const err = validateFile(f);
      if (err) errs.push(err);
      else if (next.length >= MAX_FILES) errs.push(`You can attach up to ${MAX_FILES} files`);
      else if (!next.some((x) => x.name === f.name && x.size === f.size)) next.push(f);
    }
    setErrors([...new Set(errs)]);
    onChange(next);
  }

  return (
    <div className="grid gap-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          add(e.dataTransfer.files);
        }}
        className={cn(
          "flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors",
          dragging ? "border-brand bg-brand-soft/50" : "border-border",
        )}
      >
        <UploadCloud className="size-8 text-muted-foreground" aria-hidden />
        <p className="mt-3 text-sm font-medium">Drag files here, or</p>
        <Button type="button" variant="outline" className="mt-2" onClick={() => input.current?.click()}>
          Choose files
        </Button>
        <p className="mt-3 text-xs text-muted-foreground">
          PDF, DOCX, PPTX, XLSX, ZIP, images and code files · up to 25 MB each · max {MAX_FILES}
        </p>
        <input
          ref={input}
          type="file"
          multiple
          accept={acceptAttribute}
          className="sr-only"
          aria-label="Choose files to attach"
          onChange={(e) => {
            add(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {errors.length > 0 && (
        <ul role="alert" className="space-y-1 rounded-lg bg-danger-soft px-3 py-2 text-sm text-destructive">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}

      {files.length > 0 && (
        <ul className="divide-y rounded-xl border">
          {files.map((f, i) => (
            <li key={`${f.name}-${f.size}`} className="flex items-center gap-3 px-4 py-3">
              {f.type.startsWith("image/") ? (
                <ImageIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              ) : (
                <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              )}
              <span className="min-w-0 flex-1 truncate text-sm">{f.name}</span>
              <span className="text-xs text-muted-foreground">{formatBytes(f.size)}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Remove ${f.name}`}
                onClick={() => onChange(files.filter((_, j) => j !== i))}
              >
                <X />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
