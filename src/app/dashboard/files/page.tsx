"use client";

import Link from "next/link";
import { Download, FolderLock, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { EmptyState, ErrorState, ListSkeleton, PageHeader } from "@/components/app/states";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/auth-provider";
import { signedFileUrl } from "@/lib/data/requests";
import { deleteAttachment, listMyFiles } from "@/lib/data/student";
import { useQuery } from "@/lib/hooks/use-query";
import { formatBytes } from "@/lib/requests/options";
import { formatDate } from "@/lib/requests/status";
import { friendlyError } from "@/lib/supabase/client";

export default function FilesPage() {
  const { user } = useAuth();
  const { data, error, loading, reload } = useQuery(listMyFiles, []);

  return (
    <>
      <PageHeader title="Files" description="Everything shared on your requests. Stored privately; links expire after 2 minutes." />
      {loading ? (
        <ListSkeleton />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : !data?.length ? (
        <EmptyState icon={FolderLock} title="No files yet" description="Files you or your expert share will appear here." />
      ) : (
        <div className="overflow-hidden rounded-2xl border bg-card">
          <ul className="divide-y">
            {data.map((f) => (
              <li key={f.id} className="flex items-center gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{f.file_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatBytes(f.size_bytes)} · {formatDate(f.created_at)} ·{" "}
                    {f.request && <Link href={`/dashboard/request?id=${f.request.code}`} className="hover:underline">#{f.request.code}</Link>}
                    {f.uploader_id !== user?.id && " · from your expert"}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Download ${f.file_name}`}
                  onClick={async () => {
                    try {
                      window.open(await signedFileUrl(f.storage_path, 120, f.file_name), "_blank", "noopener,noreferrer");
                    } catch (e) {
                      toast.error(friendlyError(e));
                    }
                  }}
                >
                  <Download />
                </Button>
                {f.uploader_id === user?.id && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Delete ${f.file_name}`}
                    onClick={async () => {
                      if (!confirm(`Delete ${f.file_name}?`)) return;
                      try {
                        await deleteAttachment(f);
                        toast.success("File deleted");
                        reload();
                      } catch (e) {
                        toast.error(friendlyError(e));
                      }
                    }}
                  >
                    <Trash2 />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
