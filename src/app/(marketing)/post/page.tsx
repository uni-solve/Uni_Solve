import type { Metadata } from "next";
import { Suspense } from "react";
import { PostProblemWizard } from "@/components/post/post-problem-wizard";

export const metadata: Metadata = {
  title: "Post Your Problem",
  description: "Describe what you're stuck on. UniSolve recommends the right support with an estimated price and timeline.",
  alternates: { canonical: "/post/" },
};

export default function PostPage() {
  return (
    <div className="container-page py-10 sm:py-14">
      <Suspense>
        <PostProblemWizard />
      </Suspense>
    </div>
  );
}
