import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "Become a UniSolve Expert", robots: { index: false } };

export default function Page() {
  return <ComingSoon title="Become a UniSolve Expert" description="Expert applications are opening very soon." />;
}
