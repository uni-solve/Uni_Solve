import type { Metadata } from "next";
import { Suspense } from "react";
import { TrackForm } from "./track-form";

export const metadata: Metadata = {
  title: "Track a Request",
  description: "Check the status of your UniSolve request with your Request ID and tracking key.",
  robots: { index: false },
};

export default function TrackPage() {
  return (
    <div className="container-page max-w-xl py-14">
      <h1 className="text-3xl font-semibold">Track your request</h1>
      <p className="mt-2 text-muted-foreground">Use the Request ID and private tracking key from your confirmation.</p>
      <div className="mt-8">
        <Suspense>
          <TrackForm />
        </Suspense>
      </div>
    </div>
  );
}
