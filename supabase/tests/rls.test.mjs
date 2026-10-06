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
create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb default '{}');
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
const E = await mk("e@x.com", { role: "expert", display_name: "Dr. Expert" });
const E2 = await mk("e2@x.com", { role: "expert", display_name: "Other Expert" });
const ADM = await mk("admin@x.com", {});
await db.exec(`update public.profiles set role = 'admin' where id = '${ADM}'`);
const refCode = (await q(`select referral_code from student_profiles where user_id = $1`, [A]))[0].referral_code;
await mk("c@x.com", { display_name: "Chitra", referral_code: refCode });
console.log("\nreferral code:", refCode);

console.log("\n# Classification");
const preview = await as(null, () => q(`select preview_request('project', 'CNN project', 'Need help with a CNN-based image classification project using PyTorch.', 'this_week') as p`));
const p = preview[0].p;
console.log("  ->", p.category_name, p.skills.map((s) => s.name).join(", "), JSON.stringify(p.estimate));
check(p.category_slug === "ai-ml", "CNN/PyTorch request classified as AI/ML", p.category_slug);

console.log("\n# Requests & RLS");
const created = await as(A, () => q(`select create_request('project', 'CNN image classifier', 'Need help with a CNN-based image classification project using PyTorch. Accuracy stuck at 50%.', 'this_week', null, 'suggest', null, null, true, 'in_app') as r`));
const R = created[0].r; console.log("  created", R.code);
check(/^US-\d{5}$/.test(R.code), "request code format US-xxxxx", R.code);
await expectFail("expert cannot post requests", () => as(E, () => q(`select create_request('coding','x title','this is a long enough description text','none',null,'suggest',null,null,true,'in_app')`)), "Only student");
await expectFail("anonymous (no session) cannot create", () => as(null, () => q(`select create_request('coding','x title','this is a long enough description text','none',null,'suggest',null,null,true,'in_app')`)));

const seenByB = await as(B, () => q(`select id from requests`));
check(seenByB.length === 0, "student B cannot see student A's request", seenByB.length);
const seenByA = await as(A, () => q(`select id, code from requests`));
check(seenByA.length === 1, "student A sees own request", seenByA.length);
await expectFail("tracking_token hidden from direct select", () => as(A, () => q(`select tracking_token from requests`)), "permission denied");
await expectFail("student cannot update request status directly", () => as(A, () => q(`update requests set status = 'completed' where id = $1`, [R.id])), "permission denied");
await expectFail("student cannot change own role", () => as(A, () => q(`update profiles set role = 'admin' where id = $1`, [A])), "permission denied");
await expectFail("student cannot grant self credit", () => as(A, () => q(`update student_profiles set credit_balance = 99999 where user_id = $1`, [A])), "permission denied");
await expectOk("student can update display name", () => as(A, () => q(`update profiles set display_name = 'Asha K' where id = $1`, [A])));
await expectFail("B cannot message on A's request", () => as(B, () => q(`insert into messages (request_id, sender_id, body) values ($1, $2, 'hi')`, [R.id, B])), "row-level security");
await expectFail("cannot spoof system messages", () => as(A, () => q(`insert into messages (request_id, sender_id, kind, body) values ($1, $2, 'system', 'Payment confirmed')`, [R.id, A])), "row-level security");
await expectFail("non-admin cannot set quote", () => as(A, () => q(`select admin_set_quote($1, 10)`, [R.id])), "Admins only");
await expectFail("non-admin cannot read metrics", () => as(E, () => q(`select get_admin_metrics()`)), "Admins only");
await expectFail("internal notify() not callable", () => as(A, () => q(`select notify($1, 'new_message', 'x')`, [A])), "permission denied");
const track = await as(null, () => q(`select track_request($1, $2) as t`, [R.code, R.tracking_token]));
check(track[0].t?.status === "submitted", "public tracking works with ID + key", track[0].t);
const trackBad = await as(null, () => q(`select track_request($1, 'wrong') as t`, [R.code]));
check(trackBad[0].t === null, "tracking with wrong key returns nothing", trackBad[0].t);

console.log("\n# Experts");
const appSql = `insert into expert_applications (user_id, full_name, email, phone, location, education, institution, degree, skills, expertise_areas, years_experience, agreed_to_terms)
  values ($1, $2, $3, '+919876543210', 'Hyderabad', 'M.Tech', 'IIIT Hyderabad', 'M.Tech CSE', '{pytorch,deep-learning,computer-vision}', '{3}', 4, true) returning id`;
const app1 = await as(E, () => q(appSql, [E, "Real Name", "e@x.com"]));
const app2 = await as(E2, () => q(appSql, [E2, "Other Name", "e2@x.com"]));
await expectFail("applicant cannot self-approve", () => as(E, () => q(`insert into expert_applications (user_id, full_name, email, phone, location, education, institution, degree, years_experience, agreed_to_terms, status) values ($1,'X Y','e@x.com','+919876543210','H','E','I','D',1,true,'approved')`, [E])), "permission denied");
await expectFail("unapproved expert can't accept offers", () => as(E, () => q(`select respond_to_offer(gen_random_uuid(), true)`)), "not found");
await expectOk("admin approves expert", () => as(ADM, () => q(`select admin_review_application($1, 'approved')`, [app1[0].id])));
await expectOk("admin approves second expert", () => as(ADM, () => q(`select admin_review_application($1, 'approved')`, [app2[0].id])));
const matches = await as(ADM, () => q(`select * from match_experts($1)`, [R.id]));
console.log("  matches:", matches.map((m) => `${m.display_name}:${m.score.toFixed(1)}`).join(", "));
check(matches.length === 2, "matcher ranks approved experts", matches.length);
const preAssign = await as(E, () => q(`select id from requests`));
check(preAssign.length === 0, "expert cannot see unassigned, un-offered request", preAssign.length);
await expectFail("student can't read expert's real identity", () => as(A, () => q(`select full_name from expert_applications`)).then((r) => { if (r.length) throw new Error("leak"); throw new Error("none visible"); }), "none visible");

console.log("\n# Quote, coupon, payment");
await expectOk("admin sets ₹5000 quote", () => as(ADM, () => q(`select admin_set_quote($1, 5000)`, [R.id])));
const ms = await as(A, () => q(`select id, position, amount, title from milestones where request_id = $1 order by position`, [R.id]));
console.log("  milestones:", ms.map((m) => `${m.title}=${m.amount}`).join(" | "));
check(ms.map((m) => m.amount).join() === "1500,2000,1500", "30/40/30 milestone split", ms.map((m) => m.amount));
await db.exec(`insert into coupons (code, discount_type, discount_value, first_order_only) values ('FIRST100', 'fixed', 100, true)`);
const cp = await expectOk("student applies FIRST100", () => as(A, () => q(`select apply_coupon($1, 'first100') as c`, [R.id])));
check(cp && cp[0].c.total === 4900, "coupon total 4900", cp?.[0]?.c);
await expectFail("coupons hidden from students", () => as(A, () => q(`select * from coupons`)).then((r) => { if (r.length) throw new Error("leak"); throw new Error("none visible"); }), "none visible");
const ms2 = await as(A, () => q(`select id, amount from milestones where request_id = $1 order by position`, [R.id]));
await expectFail("bad UTR rejected", () => as(A, () => q(`select submit_upi_payment($1, '12')`, [ms2[0].id])), "UTR");
await expectFail("cannot pay milestone 2 before 1", () => as(A, () => q(`select submit_upi_payment($1, '412345678901')`, [ms2[1].id])), "earlier milestones");
const pay = await expectOk("student submits UTR", () => as(A, () => q(`select submit_upi_payment($1, '412345678901') as id`, [ms2[0].id])));
// duplicate UTR: second student tries to reuse A's reference on their own request
const R2 = (await as(B, () => q(`select create_request('coding', 'Java bug', 'My Java program throws NullPointerException in the loop', 'none', null, 'suggest', null, null, true, 'in_app') as r`)))[0].r;
await as(ADM, () => q(`select admin_set_quote($1, 300)`, [R2.id]));
const bm = await as(B, () => q(`select id from milestones where request_id = $1`, [R2.id]));
await expectFail("same UTR cannot be reused", () => as(B, () => q(`select submit_upi_payment($1, '412345678901')`, [bm[0].id])), "duplicate|unique");
await expectFail("student cannot verify own payment", () => as(A, () => q(`select admin_review_payment($1, true)`, [pay[0].id])), "Admins only");
await expectOk("admin verifies payment", () => as(ADM, () => q(`select admin_review_payment($1, true)`, [pay[0].id])));
await expectOk("admin assigns expert", () => as(ADM, () => q(`select admin_assign_expert($1, $2)`, [R.id, E])));
const st = await as(A, () => q(`select status from requests where id = $1`, [R.id]));
check(st[0].status === "assigned", "status = assigned after payment + assignment", st[0].status);

console.log("\n# Expert access & delivery");
const eSees = await as(E, () => q(`select id from requests`));
check(eSees.length === 1, "assigned expert sees the request", eSees.length);
const e2Sees = await as(E2, () => q(`select id from requests`));
check(e2Sees.length === 0, "other expert does not", e2Sees.length);
const anonProfile = await as(E, () => q(`select display_name from profiles where id = $1`, [A]));
check(anonProfile.length === 0, "anonymous student's profile hidden from expert", anonProfile);
const eStudentPriv = await as(E, () => q(`select * from student_profiles`));
check(eStudentPriv.length === 0, "expert can't read student private profile", eStudentPriv.length);
await expectOk("student sends message", () => as(A, () => q(`insert into messages (request_id, sender_id, body) values ($1, $2, 'Here is my notebook')`, [R.id, A])));
const eMsgs = await as(E, () => q(`select kind, body from messages where request_id = $1 order by created_at`, [R.id]));
check(eMsgs.some((m) => m.body === "Here is my notebook"), "expert reads chat (" + eMsgs.length + " msgs incl. system)", eMsgs);
const eNotif = await as(E, () => q(`select type from notifications`));
check(eNotif.some((n) => n.type === "new_message"), "expert notified of new message", eNotif);
await expectOk("expert starts work", () => as(E, () => q(`select expert_start_work($1)`, [R.id])));
await expectFail("other expert can't deliver", () => as(E2, () => q(`select expert_deliver_milestone($1)`, [ms2[0].id])), "Not your request");
await expectOk("expert delivers milestone 1", () => as(E, () => q(`select expert_deliver_milestone($1, 'Fixed LR schedule')`, [ms2[0].id])));
await expectOk("student approves milestone 1", () => as(A, () => q(`select student_review_milestone($1, true)`, [ms2[0].id])));
const bal = await as(E, () => q(`select expert_balance() as b`));
console.log("  expert balance:", JSON.stringify(bal[0].b));
check(bal[0].b.earned === 1176, "expert earned 80% of ₹1470", bal[0].b);
await expectFail("expert can't see another expert's balance", () => as(E2, () => q(`select expert_balance($1) as b`, [E])).then((r) => { if (r[0].b) throw new Error("leak"); throw new Error("null"); }), "null");

console.log("\n# Storage");
await expectOk("student uploads into own request folder", () => as(A, () => q(`insert into storage.objects (bucket_id, name, owner_id) values ('request-files', $1, $2)`, [`${R.id}/f1-notes.pdf`, A])));
await expectFail("student B can't upload into A's request", () => as(B, () => q(`insert into storage.objects (bucket_id, name, owner_id) values ('request-files', $1, $2)`, [`${R.id}/evil.pdf`, B])), "row-level security");
const bFiles = await as(B, () => q(`select name from storage.objects where bucket_id = 'request-files'`));
check(bFiles.length === 0, "student B can't list A's files", bFiles);
const eFiles = await as(E, () => q(`select name from storage.objects where bucket_id = 'request-files'`));
check(eFiles.length === 1, "assigned expert can access request files", eFiles);
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
const audit = await as(ADM, () => q(`select action from audit_logs order by id`));
console.log("  audit:", audit.map((a) => a.action).join(", "));
const auditA = await as(A, () => q(`select * from audit_logs`));
check(auditA.length === 0, "audit log admin-only", auditA.length);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
