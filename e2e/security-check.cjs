// Usage: node --env-file=.env.local e2e/security-check.cjs
// Leaves one empty guest account behind (printed as GUEST_ID).
// Adversarial checks against the LIVE Supabase project, using only the public key
// an attacker can read from the website's JavaScript.
const { createClient } = require("@supabase/supabase-js");
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!URL_ || !KEY) throw new Error("Load .env.local first (NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY)");

let pass = 0, fail = 0;
const blocked = (name, res) => {
  const ok = Boolean(res.error) || (Array.isArray(res.data) && res.data.length === 0) || res.data === null || res.count === 0;
  ok ? pass++ : fail++;
  console.log(ok ? "  BLOCKED" : "  !!! LEAK", name, ok ? `(${(res.error?.message ?? "no rows").slice(0, 60)})` : JSON.stringify(res.data).slice(0, 160));
};

(async () => {
  const anon = createClient(URL_, KEY, { auth: { persistSession: false } });
  console.log("# Anonymous attacker (no login)");
  for (const t of ["requests", "profiles", "student_profiles", "payments", "messages", "request_attachments", "transactions", "coupons", "audit_logs", "support_tickets", "notifications", "expert_applications", "disputes", "milestones", "referrals"]) {
    blocked(`read ${t}`, await anon.from(t).select("*").limit(5));
  }
  blocked("update UPI ID (payment hijack)", await anon.from("platform_settings").update({ upi_id: "attacker@upi" }).eq("id", true).select());
  blocked("admin metrics", await anon.rpc("get_admin_metrics"));
  blocked("list students + emails", await anon.rpc("admin_list_students"));
  blocked("create request without session", await anon.rpc("create_request", { p_work_type: "coding", p_title: "x", p_description: "y".repeat(30), p_deadline: "none", p_deadline_at: null, p_budget: "suggest", p_budget_min: null, p_budget_max: null, p_is_anonymous: true, p_contact: "in_app" }));
  for (const b of ["request-files", "payment-proofs", "expert-docs"]) blocked(`list storage ${b}`, await anon.storage.from(b).list("", { limit: 5 }));
  blocked("upload fake UPI QR", await anon.storage.from("platform").upload(`evil-${Date.now()}.png`, new Blob(["x"], { type: "image/png" })));
  blocked("brute-force tracking (guess key)", await anon.rpc("track_request", { p_code: "US-88706", p_token: "0000" }));

  console.log("\n# Guest attacker (free anonymous session)");
  const guest = createClient(URL_, KEY, { auth: { persistSession: false } });
  const { data: s, error: e } = await guest.auth.signInAnonymously();
  if (e) return console.log("guest sign-in failed:", e.message);
  const uid = s.user.id;
  blocked("make myself admin", await guest.from("profiles").update({ role: "admin" }).eq("id", uid).select());
  blocked("give myself ₹99,999 credit", await guest.from("student_profiles").update({ credit_balance: 9999900 }).eq("user_id", uid).select());
  blocked("read other students' requests", await guest.from("requests").select("code"));
  blocked("read other people's payments", await guest.from("payments").select("*"));
  blocked("read all messages", await guest.from("messages").select("*"));
  blocked("change UPI ID", await guest.from("platform_settings").update({ upi_id: "attacker@upi" }).eq("id", true).select());
  blocked("create 100%-off coupon", await guest.from("coupons").insert({ code: "HACK100", discount_type: "percent", discount_value: 100 }).select());
  blocked("verify a payment", await guest.rpc("admin_review_payment", { p_payment: "00000000-0000-0000-0000-000000000000", p_approve: true }));
  blocked("set a quote", await guest.rpc("admin_set_quote", { p_request: "00000000-0000-0000-0000-000000000000", p_price: 1 }));
  blocked("read student emails", await guest.rpc("admin_user_contact", { p_user: uid }));
  blocked("read audit log", await guest.from("audit_logs").select("*"));
  blocked("call internal notify()", await guest.rpc("notify", { p_user: uid, p_type: "new_message", p_title: "x" }));
  blocked("insert fake system message", await guest.from("messages").insert({ request_id: "00000000-0000-0000-0000-000000000000", sender_id: uid, kind: "system", body: "Payment confirmed" }).select());
  blocked("upload into someone's request folder", await guest.storage.from("request-files").upload(`00000000-0000-0000-0000-000000000000/evil.pdf`, new Blob(["x"], { type: "application/pdf" })));
  blocked("upload malware type (.exe)", await guest.storage.from("payment-proofs").upload(`${uid}/x.exe`, new Blob(["MZ"], { type: "application/x-msdownload" })));
  blocked("suspend another user", await guest.rpc("admin_set_suspended", { p_user: uid, p_suspended: true }));

  console.log(`\n${pass} attacks blocked, ${fail} leaks`);
  console.log("GUEST_ID=" + uid);
  process.exitCode = fail ? 1 : 0;
})();
