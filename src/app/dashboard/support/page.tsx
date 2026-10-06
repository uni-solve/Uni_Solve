import { Suspense } from "react";
import { SupportView } from "./support-view";

export default function SupportPage() {
  return (
    <Suspense>
      <SupportView />
    </Suspense>
  );
}
