import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "Log In", robots: { index: false } };

export default function Page() {
  return <ComingSoon title="Log In" description="Student and expert accounts are opening very soon." />;
}
