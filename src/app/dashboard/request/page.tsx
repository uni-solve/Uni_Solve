import { Suspense } from "react";
import { RequestView } from "./request-view";

export default function RequestPage() {
  return (
    <Suspense>
      <RequestView />
    </Suspense>
  );
}
