// Usage: npm run test:db
// Runs UniSolve migrations against PGlite with minimal Supabase stubs, then
// exercises the workflow and RLS as different users.
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const MIG = fileURLToPath(new URL("../migrations/", import.meta.url));
const db = new PGlite({ extensions: { pgcrypto, pg_trgm } });

const stubs = `
create role anon nologin; create role authenticated nologin; create role authenticator nologin; create role service_role nologin;
create schema extensions;
create extension pgcrypto with schema extensions;
create schema auth;
create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb default '{}', is_anonymous boolean default false, email_confirmed_at timestamptz);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth, extensions to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
create schema storage;
create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text, owner_id text);
alter table storage.objects enable row level security;
create function storage.foldername(name text) returns text[] language sql immutable as $$
  select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
grant usage on schema storage to anon, authenticated;
grant select, insert, update, delete on storage.objects to anon, authenticated;
grant execute on function storage.foldername(text) to anon, authenticated;
create publication supabase_realtime;
grant usage on schema public to anon, authenticated;
alter default privileges in schema public grant all on tables to anon, authenticated;
alter default privileges in schema public grant all on sequences to anon, authenticated;
alter default privileges in schema public grant execute on functions to anon, authenticated;
`;

let passed = 0, failed = 0;
const ok = (name) => { passed++; console.log("  PASS", name); };
const bad = (name, e) => { failed++; console.log("  FAIL", name, "→", e?.message ?? e); };
const check = (cond, name, detail) => (cond ? ok(name) : bad(name, detail));

async function as(uid, fn) {
  await db.exec(uid ? `set role authenticated; select set_config('request.jwt.claim.sub', '${uid}', false);`
                    : `set role anon; select set_config('request.jwt.claim.sub', '', false);`);
  try { return await fn(); } finally { await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false);`); }
}
const q = async (sql, params) => (await db.query(sql, params)).rows;
async function expectOk(name, fn) { try { const r = await fn(); ok(name); return r; } catch (e) { bad(name, e); } }
async function expectFail(name, fn, match) {
  try { await fn(); bad(name, "expected an error but it succeeded"); }
  catch (e) { if (!match || new RegExp(match, "i").test(e.message)) ok(name + "  [" + e.message.slice(0, 70) + "]"); else bad(name, e); }
}

await db.exec(stubs);
for (const f of readdirSync(MIG).filter((f) => f.endsWith(".sql")).sort()) {
  try { await db.exec(readFileSync(join(MIG, f), "utf8")); console.log("migrated", f); }
  catch (e) { console.log("MIGRATION FAILED", f, "\n", e.message); process.exit(1); }
}

// ---- users -------------------------------------------------------------------
const mk = async (email, meta) => (await q(`insert into auth.users (email, raw_user_meta_data) values ($1, $2) returning id`, [email, meta]))[0].id;
const A = await mk("a@x.com", { display_name: "Asha" });
const B = await mk("b@x.com", { display_name: "Bala" });
const X = await mk("x@x.com", { role: "expert", display_name: "Wants To Be Expert" });
const ADM = await mk("admin@x.com", {});
await db.exec(`update public.profiles set role = 'admin' where id = '${ADM}'`);
const refCode = (await q(`select referral_code from student_profiles where user_id = $1`, [A]))[0].referral_code;
await mk("c@x.com", { display_name: "Chitra", referral_code: refCode });
console.log("\nreferral code:", refCode);

console.log("\n# Solo mode sign-ups");
const xRole = (await q(`select role from profiles where id = $1`, [X]))[0].role;
check(xRole === "student", "role metadata can't create experts (solo mode)", xRole);

console.log("\n# Classification");
const preview = await as(null, () => q(`select preview_request('project', 'CNN project', 'Need help with a CNN-based image classification project using PyTorch.', 'this_week') as p`));
const p = preview[0].p;
console.log("  ->", p.category_name, p.skills.map((s) => s.name).join(", "), JSON.stringify(p.estimate));
check(p.category_slug === "ai-ml", "CNN/PyTorch request classified as AI/ML", p.category_slug);

console.log("\n# ECE classification");
for (const [text, wt] of [
  ["5G NR massive MIMO beamforming simulation in MATLAB for my wireless communications project", "project"],
  ["Design a microstrip patch antenna in HFSS at 2.4 GHz and plot S-parameters", "assignment"],
  ["ESP32 IoT soil moisture sensor project with firmware and PCB", "hardware"],
]) {
  const r = (await as(null, () => q(`select preview_request($1, '', $2, 'this_week') as p`, [wt, text])))[0].p;
  check(r.category_slug === "ece", `ECE detected: ${r.skills.map((s) => s.name).slice(0, 3).join(", ")}`, r.category_slug);
}
const plain = (await as(null, () => q(`select preview_request('assignment', '', 'I need to upload again the number of first questions for my program', 'none') as p`)))[0].p;
check(plain.category_slug !== "ece", "everyday words don't trigger ECE", plain);

console.log("\n# Requests & RLS");
const created = await as(A, () => q(`select create_request('project', 'CNN image classifier', 'Need help with a CNN-based image classification project using PyTorch. Accuracy stuck at 50%.', 'this_week', null, 'custom', 4000, 4000, true, 'in_app') as r`));
const R = created[0].r;
console.log("  created", R.code);
check(/^US-\d{5}$/.test(R.code), "request code format US-xxxxx", R.code);
await expectFail("anonymous (no session) cannot create", () => as(null, () => q(`select create_request('coding','x title','this is a long enough description text','none',null,'suggest',null,null,true,'in_app')`)));

const seenByB = await as(B, () => q(`select id from requests`));
check(seenByB.length === 0, "student B cannot see student A's request", seenByB.length);
const seenByA = await as(A, () => q(`select id, code from requests`));
check(seenByA.length === 1, "student A sees own request", seenByA.length);
const seenByAdmin = await as(ADM, () => q(`select id from requests`));
check(seenByAdmin.length === 1, "admin sees all requests", seenByAdmin.length);
await expectFail("tracking_token hidden from direct select", () => as(A, () => q(`select tracking_token from requests`)), "permission denied");
await expectFail("student cannot update request status directly", () => as(A, () => q(`update requests set status = 'completed' where id = $1`, [R.id])), "permission denied");
await expectFail("student cannot change own role", () => as(A, () => q(`update profiles set role = 'admin' where id = $1`, [A])), "permission denied");
await expectFail("student cannot grant self credit", () => as(A, () => q(`update student_profiles set credit_balance = 99999 where user_id = $1`, [A])), "permission denied");
await expectOk("student can update display name", () => as(A, () => q(`update profiles set display_name = 'Asha K' where id = $1`, [A])));
await expectFail("B cannot message on A's request", () => as(B, () => q(`insert into messages (request_id, sender_id, body) values ($1, $2, 'hi')`, [R.id, B])), "row-level security");
await expectFail("cannot spoof system messages", () => as(A, () => q(`insert into messages (request_id, sender_id, kind, body) values ($1, $2, 'system', 'Payment confirmed')`, [R.id, A])), "row-level security");
await expectFail("non-admin cannot set quote", () => as(A, () => q(`select admin_set_quote($1, 10)`, [R.id])), "Admins only");
await expectFail("non-admin cannot read metrics", () => as(B, () => q(`select get_admin_metrics()`)), "Admins only");
await expectFail("non-admin cannot mark delivered", () => as(A, () => q(`select admin_mark_delivered($1)`, [R.id])), "Admins only");
await expectFail("internal notify() not callable", () => as(A, () => q(`select notify($1, 'new_message', 'x')`, [A])), "permission denied");
const track = await as(null, () => q(`select track_request($1, $2) as t`, [R.code, R.tracking_token]));
check(track[0].t?.status === "submitted", "public tracking works with ID + key", track[0].t);
const trackBad = await as(null, () => q(`select track_request($1, 'wrong') as t`, [R.code]));
check(trackBad[0].t === null, "tracking with wrong key returns nothing", trackBad[0].t);
const adminNotif = await as(ADM, () => q(`select type from notifications`));
check(adminNotif.some((n) => n.type === "request_received"), "admin notified of new request", adminNotif);

console.log("\n# Accept amount (50/50), coupon, payment");
await expectOk("admin accepts student's ₹4000", () => as(ADM, () => q(`select admin_set_quote($1, 4000)`, [R.id])));
const ms = await as(A, () => q(`select id, position, amount, title from milestones where request_id = $1 order by position`, [R.id]));
console.log("  milestones:", ms.map((m) => `${m.title}=${m.amount}`).join(" | "));
check(ms.map((m) => m.amount).join() === "2000,2000", "50% advance / 50% on delivery", ms.map((m) => m.amount));
const quoteMsg = await as(A, () => q(`select message from request_events where request_id = $1 and status = 'quoted'`, [R.id]));
check(/accepted/.test(quoteMsg[0]?.message), "student told their amount was accepted", quoteMsg);
await db.exec(`insert into coupons (code, discount_type, discount_value, first_order_only) values ('FIRST100', 'fixed', 100, true)`);
const cp = await expectOk("student applies FIRST100", () => as(A, () => q(`select apply_coupon($1, 'first100') as c`, [R.id])));
check(cp && cp[0].c.total === 3900, "coupon total 3900", cp?.[0]?.c);
await expectFail("coupons hidden from students", () => as(A, () => q(`select * from coupons`)).then((r) => { if (r.length) throw new Error("leak"); throw new Error("none visible"); }), "none visible");
const ms2 = await as(A, () => q(`select id, amount from milestones where request_id = $1 order by position`, [R.id]));
await expectFail("bad UTR rejected", () => as(A, () => q(`select submit_upi_payment($1, '12')`, [ms2[0].id])), "UTR");
await expectFail("cannot pay balance before advance", () => as(A, () => q(`select submit_upi_payment($1, '412345678901')`, [ms2[1].id])), "earlier milestones");
const pay = await expectOk("student submits advance UTR", () => as(A, () => q(`select submit_upi_payment($1, '412345678901') as id`, [ms2[0].id])));
const R2 = (await as(B, () => q(`select create_request('coding', 'Java bug', 'My Java program throws NullPointerException in the loop', 'none', null, 'suggest', null, null, true, 'in_app') as r`)))[0].r;
await as(ADM, () => q(`select admin_set_quote($1, 300)`, [R2.id]));
const bm = await as(B, () => q(`select id from milestones where request_id = $1 order by position`, [R2.id]));
await expectFail("same UTR cannot be reused", () => as(B, () => q(`select submit_upi_payment($1, '412345678901')`, [bm[0].id])), "duplicate|unique");
await expectFail("student cannot verify own payment", () => as(A, () => q(`select admin_review_payment($1, true)`, [pay[0].id])), "Admins only");
await expectOk("admin verifies advance", () => as(ADM, () => q(`select admin_review_payment($1, true)`, [pay[0].id])));
let st = await as(A, () => q(`select status from requests where id = $1`, [R.id]));
check(st[0].status === "in_progress", "advance verified -> in progress (solo)", st[0].status);

console.log("\n# Solo delivery");
await expectOk("student sends message", () => as(A, () => q(`insert into messages (request_id, sender_id, body) values ($1, $2, 'Here is my notebook')`, [R.id, A])));
const admMsgs = await as(ADM, () => q(`select body from messages where request_id = $1`, [R.id]));
check(admMsgs.some((m) => m.body === "Here is my notebook"), "admin reads chat", admMsgs.length);
const admMsgNotif = await as(ADM, () => q(`select type, link from notifications where type = 'new_message'`));
check(admMsgNotif.some((n) => n.link.startsWith("/admin/request")), "admin notified of student message", admMsgNotif);
await expectOk("admin replies in chat", () => as(ADM, () => q(`insert into messages (request_id, sender_id, body) values ($1, $2, 'Got it, looking now')`, [R.id, ADM])));
await expectFail("student can't complete before delivery", () => as(A, () => q(`select complete_request($1)`, [R.id])), "after delivery");
await expectOk("admin marks delivered", () => as(ADM, () => q(`select admin_mark_delivered($1, 'Solution shared in chat')`, [R.id])));
await expectFail("student can't complete with balance unpaid", () => as(A, () => q(`select complete_request($1)`, [R.id])), "remaining balance");
await expectOk("student requests changes", () => as(A, () => q(`select student_request_changes($1, 'Please explain step 3')`, [R.id])));
await expectOk("admin re-delivers", () => as(ADM, () => q(`select admin_mark_delivered($1)`, [R.id])));
const pay2 = await expectOk("student pays balance", () => as(A, () => q(`select submit_upi_payment($1, '512345678901') as id`, [ms2[1].id])));
await expectOk("admin verifies balance", () => as(ADM, () => q(`select admin_review_payment($1, true)`, [pay2[0].id])));
await expectFail("B can't complete A's request", () => as(B, () => q(`select complete_request($1)`, [R.id])), "Not your request");
await expectOk("student marks complete", () => as(A, () => q(`select complete_request($1)`, [R.id])));
st = await as(A, () => q(`select status from requests where id = $1`, [R.id]));
check(st[0].status === "completed", "request completed", st[0].status);
await expectOk("student leaves review", () => as(A, () => q(`select submit_review($1, 5, 'Got excellent help debugging my computer vision project.', true)`, [R.id])));
const ev = await as(A, () => q(`select status from request_events where request_id = $1 and kind = 'status' order by id`, [R.id]));
console.log("  timeline:", ev.map((e) => e.status).join(" → "));

console.log("\n# Storage");
await expectOk("student uploads into own request folder", () => as(B, () => q(`insert into storage.objects (bucket_id, name, owner_id) values ('request-files', $1, $2)`, [`${R2.id}/f1-notes.pdf`, B])));
await expectFail("student A can't upload into B's request", () => as(A, () => q(`insert into storage.objects (bucket_id, name, owner_id) values ('request-files', $1, $2)`, [`${R2.id}/evil.pdf`, A])), "row-level security");
const aFiles = await as(A, () => q(`select name from storage.objects where bucket_id = 'request-files'`));
check(aFiles.length === 0, "student A can't list B's files", aFiles);
const admFiles = await as(ADM, () => q(`select name from storage.objects where bucket_id = 'request-files'`));
check(admFiles.length === 1, "admin can access request files", admFiles);
await expectFail("no uploads to completed requests", () => as(A, () => q(`insert into storage.objects (bucket_id, name, owner_id) values ('request-files', $1, $2)`, [`${R.id}/late.pdf`, A])), "row-level security");
await expectFail("malformed path matches nothing", () => as(A, () => q(`insert into storage.objects (bucket_id, name, owner_id) values ('request-files', 'not-a-uuid/x.pdf', $1)`, [A])), "row-level security");
await expectFail("non-admin can't replace UPI QR", () => as(A, () => q(`insert into storage.objects (bucket_id, name, owner_id) values ('platform', 'upi-qr.png', $1)`, [A])), "row-level security");

console.log("\n# Referral, tickets, metrics");
const refs = await as(A, () => q(`select status from referrals`));
check(refs.length === 1, "referral recorded for C", refs);
const t = await as(B, () => q(`select create_support_ticket('payment', 'UPI not verified', 'I paid but nothing happened') as t`));
check(/^SUP-\d{5}$/.test(t[0].t.code), "ticket code " + t[0].t.code, t);
const tA = await as(A, () => q(`select id from support_tickets`));
check(tA.length === 0, "A can't see B's ticket", tA);
const m = await as(ADM, () => q(`select get_admin_metrics() as m`));
console.log("  metrics:", JSON.stringify(m[0].m));
const ps = await as(null, () => q(`select get_public_stats() as s`));
check(ps[0].s === null, "public stats hidden below threshold (no fake numbers)", ps[0].s);
const studentsList = await as(ADM, () => q(`select email, requests, total_spent from admin_list_students()`));
check(studentsList.some((r) => r.email === "a@x.com" && Number(r.total_spent) === 3900), "admin student list with spend", studentsList);
await expectFail("students can't list students", () => as(A, () => q(`select * from admin_list_students()`)), "Admins only");
await expectFail("students can't read contact details", () => as(B, () => q(`select admin_user_contact($1)`, [A])), "Admins only");
const contact = await as(ADM, () => q(`select admin_user_contact($1) as c`, [A]));
check(contact[0].c.email === "a@x.com", "admin sees student contact", contact[0].c);
const cats = await as(ADM, () => q(`select * from admin_category_breakdown(30)`));
check(cats.length >= 8, "category breakdown", cats.length);
const audit = await as(ADM, () => q(`select action from audit_logs order by id`));
console.log("  audit:", audit.map((a) => a.action).join(", "));
const auditA = await as(A, () => q(`select * from audit_logs`));
check(auditA.length === 0, "audit log admin-only", auditA.length);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
