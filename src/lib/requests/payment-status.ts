import type { Tone } from "@/components/status-indicator";
import type { Payment } from "@/lib/data/student";

export const paymentMeta: Record<Payment["status"], { label: string; tone: Tone }> = {
  pending_verification: { label: "Verifying", tone: "info" },
  verified: { label: "Paid", tone: "success" },
  rejected: { label: "Not verified", tone: "danger" },
  refunded: { label: "Refunded", tone: "muted" },
  partially_refunded: { label: "Partly refunded", tone: "warning" },
};
