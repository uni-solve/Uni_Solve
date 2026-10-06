import { Suspense } from "react";
import { AdminWorkspace } from "./workspace";

export default function AdminRequestPage() {
  return (
    <Suspense>
      <AdminWorkspace />
    </Suspense>
  );
}
