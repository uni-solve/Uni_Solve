import type { Metadata } from "next";
import { Suspense } from "react";
import { PostProblemForm } from "@/components/post/post-problem-form";

export const metadata: Metadata = {
  title: "Post Your Problem",
  description: "Describe what you're stuck on. UniSolve recommends the right support with an estimated price and timeline.",
  alternates: { canonical: "/post/" },
};

export default function PostPage() {
  return (
    <div className="container-page max-w-6xl py-10 sm:py-14">
      <Suspense>
        <PostProblemForm />
      </Suspense>
    </div>
  );
}
