import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "Dashboard", robots: { index: false } };

export default function Page() {
  return <ComingSoon title="Dashboard" description="Your private dashboard is opening very soon." />;
}
