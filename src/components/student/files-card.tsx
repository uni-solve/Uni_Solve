"use client";

import { useRef, useState } from "react";
import { Download, FileText, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { uploadAttachment, signedFileUrl } from "@/lib/data/requests";
import { deleteAttachment, type Attachment } from "@/lib/data/student";
import { acceptAttribute, formatBytes, validateFile } from "@/lib/requests/options";
import { formatDate } from "@/lib/requests/status";
import { friendlyError } from "@/lib/supabase/client";

export function FilesCard({
  requestId,
  me,
  files,
  canUpload,
  onChange,
}: {
  requestId: string;
  me: string;
  files: Attachment[];
  canUpload: boolean;
  onChange: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function upload(list: FileList | null) {
    if (!list?.length) return;
    setBusy(true);
    for (const f of Array.from(list)) {
      const err = validateFile(f);
      if (err) {
        toast.error(err);
        continue;
      }
      try {
        await uploadAttachment(requestId, me, f);
      } catch (e) {
        toast.error(`${f.name}: ${friendlyError(e)}`);
      }
    }
    setBusy(false);
    onChange();
  }

  async function download(f: Attachment) {
    try {
      window.open(await signedFileUrl(f.storage_path, 120, f.file_name), "_blank", "noopener,noreferrer");
    } catch (e) {
      toast.error(friendlyError(e));
    }
  }

  async function remove(f: Attachment) {
    if (!confirm(`Delete ${f.file_name}? This can't be undone.`)) return;
    try {
      await deleteAttachment(f);
      toast.success("File deleted");
      onChange();
    } catch (e) {
      toast.error(friendlyError(e));
    }
  }

  return (
    <section className="rounded-2xl border bg-card">
      <div className="flex items-center justify-between border-b px-5 py-3">
        <h2 className="text-sm font-semibold">Files <span className="font-normal text-muted-foreground">({files.length})</span></h2>
        {canUpload && (
          <>
            <Button variant="ghost" size="sm" onClick={() => input.current?.click()} disabled={busy}>
              {busy ? <Loader2 className="animate-spin" /> : <Upload />} Upload
            </Button>
            <input ref={input} type="file" multiple accept={acceptAttribute} className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => { upload(e.target.files); e.target.value = ""; }} />
          </>
        )}
      </div>
      {files.length === 0 ? (
        <p className="px-5 py-6 text-center text-sm text-muted-foreground">No files yet.</p>
      ) : (
        <ul className="divide-y">
          {files.map((f) => (
            <li key={f.id} className="flex items-center gap-3 px-5 py-3">
              <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{f.file_name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatBytes(f.size_bytes)} · {formatDate(f.created_at)} · {f.uploader_id === me ? "You" : "Shared with you"}
                </p>
              </div>
              <Button variant="ghost" size="icon-sm" aria-label={`Download ${f.file_name}`} onClick={() => download(f)}>
                <Download />
              </Button>
              {f.uploader_id === me && (
                <Button variant="ghost" size="icon-sm" aria-label={`Delete ${f.file_name}`} onClick={() => remove(f)}>
                  <Trash2 />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
      <p className="border-t px-5 py-2.5 text-[11px] text-muted-foreground">Files are private. Download links expire after 2 minutes.</p>
    </section>
  );
}
