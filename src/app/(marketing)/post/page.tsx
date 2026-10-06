import type { Metadata } from "next";
import { Suspense } from "react";
import { PostProblemForm } from "@/components/post/post-problem-form";

export const metadata: Metadata = {
  title: "Send Your Assignment",
  description: "Upload your assignment or project with your budget and deadline. We solve it step by step and teach you how.",
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
