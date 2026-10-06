"use client";

import { PageHeader } from "@/components/app/states";
import { ConversationList } from "@/components/chat/conversation-list";

export default function MessagesPage() {
  return (
    <>
      <PageHeader title="Messages" description="Private conversations for each request. Your phone number is never shared." />
      <ConversationList basePath="/dashboard/request" />
    </>
  );
}
