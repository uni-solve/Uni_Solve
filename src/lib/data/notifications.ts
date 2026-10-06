import { getSupabase } from "@/lib/supabase/client";
import { must } from "@/lib/hooks/use-query";

export type AppNotification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
};

export async function listNotifications(limit = 20) {
  return must(
    await getSupabase()
      .from("notifications")
      .select("id, type, title, body, link, read_at, created_at")
      .order("created_at", { ascending: false })
      .limit(limit),
  ) as AppNotification[];
}

export async function markNotificationsRead(ids?: string[]) {
  const { error } = await getSupabase().rpc("mark_notifications_read", { p_ids: ids ?? null });
  if (error) throw error;
}

/** Live inserts for the signed-in user's notifications (RLS-filtered by Realtime). */
export function subscribeToNotifications(userId: string, onInsert: (n: AppNotification) => void) {
  const supabase = getSupabase();
  const channel = supabase
    .channel(`notifications:${userId}`)
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, (payload) =>
      onInsert(payload.new as AppNotification),
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}
