import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "Create your account", robots: { index: false } };

export default function Page() {
  return <ComingSoon title="Create your account" description="Student and expert accounts are opening very soon." />;
}
