import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "Post Your Problem", robots: { index: false } };

export default function Page() {
  return <ComingSoon title="Post Your Problem" description="The guided request form is opening very soon." />;
}
