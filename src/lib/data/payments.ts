import { getSupabase } from "@/lib/supabase/client";
import { must } from "@/lib/hooks/use-query";

export type PaymentSettings = {
  upi_id: string | null;
  upi_payee_name: string | null;
  upi_qr_path: string | null;
  milestone_split: number[];
  referral_reward: number;
  referral_enabled: boolean;
};

export async function getPaymentSettings() {
  return must(
    await getSupabase()
      .from("platform_settings")
      .select("upi_id, upi_payee_name, upi_qr_path, milestone_split, referral_reward, referral_enabled")
      .single(),
  ) as PaymentSettings;
}

export function publicPlatformUrl(path: string | null) {
  if (!path) return null;
  return getSupabase().storage.from("platform").getPublicUrl(path).data.publicUrl;
}

/** Standard UPI deep link — opens GPay/PhonePe/Paytm with amount prefilled on phones. */
export function upiLink(s: PaymentSettings, amount: number, note: string) {
  if (!s.upi_id) return null;
  const params = new URLSearchParams({ pa: s.upi_id, pn: s.upi_payee_name ?? "UniSolve", am: amount.toFixed(2), cu: "INR", tn: note });
  return `upi://pay?${params.toString()}`;
}

const PROOF_TYPES: Record<string, string> = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", pdf: "application/pdf" };

export async function submitUpiPayment(opts: { userId: string; milestoneId: string; utr: string; proof?: File | null; useCredit: boolean }) {
  const supabase = getSupabase();
  let proofPath: string | null = null;
  if (opts.proof) {
    const ext = opts.proof.name.split(".").pop()?.toLowerCase() ?? "";
    const type = PROOF_TYPES[ext];
    if (!type) throw new Error("Upload the payment screenshot as PNG, JPG, WEBP or PDF");
    if (opts.proof.size > 5 * 1024 * 1024) throw new Error("Screenshot must be 5 MB or smaller");
    proofPath = `${opts.userId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("payment-proofs").upload(proofPath, opts.proof, { contentType: type });
    if (error) throw error;
  }
  return must(
    await supabase.rpc("submit_upi_payment", {
      p_milestone: opts.milestoneId,
      p_utr: opts.utr.trim(),
      p_proof_path: proofPath,
      p_use_credit: opts.useCredit,
    }),
  ) as string;
}
