import Link from "next/link";
import { Hammer } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

/** Temporary placeholder for routes delivered in a later build phase. */
export function ComingSoon({ title, description }: { title: string; description: string }) {
  return (
    <div className="container-page flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-brand-soft text-brand">
        <Hammer className="size-5" aria-hidden />
      </span>
      <h1 className="mt-6 text-3xl font-semibold">{title}</h1>
      <p className="mt-3 max-w-md text-muted-foreground">{description}</p>
      <Link href="/" className={`${buttonVariants({ variant: "outline" })} mt-8`}>
        Back to home
      </Link>
    </div>
  );
}
