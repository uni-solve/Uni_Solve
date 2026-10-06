// Full solo-mode journey with two separate sessions (student + admin).
// Usage: build + `npx serve out -l 4173`, then
//   ADMIN_EMAIL=... ADMIN_PASSWORD=... node e2e/full-journey.mjs
// Creates real records in the configured Supabase project and prints the
// request code so the data can be cleaned up afterwards.
import puppeteer from "puppeteer-core";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:4173";
const SHOTS = process.env.E2E_SHOTS_DIR ?? "e2e";
const { ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
if (!ADMIN_EMAIL || !ADMIN_PASSWORD) throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD");

const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: "new",
  defaultViewport: { width: 1280, height: 900 },
});
const errors = [];
async function newPage() {
  const ctx = await browser.createBrowserContext(); // isolated cookies/storage
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("console", (m) => m.type() === "error" && !/Failed to load resource/.test(m.text()) && errors.push("console: " + m.text()));
  page.on("dialog", (d) => d.accept());
  return page;
}
const step = (s) => console.log("•", s);
const waitText = (page, text, timeout = 25000) => page.waitForFunction((t) => document.body.innerText.includes(t), { timeout }, text);
async function click(page, text, sel = "button") {
  await page.waitForFunction(
    (t, s) => [...document.querySelectorAll(s)].some((el) => el.textContent.trim().startsWith(t) && !el.disabled && el.offsetParent !== null),
    { timeout: 25000 }, text, sel);
  await page.evaluate((t, s) => [...document.querySelectorAll(s)].find((el) => el.textContent.trim().startsWith(t) && !el.disabled && el.offsetParent !== null).click(), text, sel);
}
const utr = () => "9" + String(Math.floor(Math.random() * 1e11)).padStart(11, "0");

const student = await newPage();
const admin = await newPage();
let code;
try {
  // 1. Student posts
  await student.goto(`${BASE}/post/`, { waitUntil: "networkidle0" });
  await click(student, "Project", "label");
  await student.type("#description", "E2E full journey: need guidance structuring a Flask REST API project with SQLite, plus help debugging a 500 error on POST.");
  await student.type("#amount-input", "2000");
  await click(student, "This week", "label");
  await student.click('#agree [role="checkbox"]');
  await click(student, "Send");
  await waitText(student, "Your request has been created.");
  code = await student.evaluate(() => document.body.innerText.match(/US-\d{5,6}/)?.[0]);
  step("student posted " + code);

  // 2. Admin logs in and accepts the budget
  await admin.goto(`${BASE}/login/`, { waitUntil: "networkidle0" });
  await admin.type("#email", ADMIN_EMAIL);
  await admin.type("#password", ADMIN_PASSWORD);
  await click(admin, "Log In");
  await admin.waitForFunction(() => location.pathname.startsWith("/admin"), { timeout: 25000 });
  step("admin logged in → " + (await admin.evaluate(() => location.pathname)));
  await waitText(admin, "New — needs a reply");
  await admin.screenshot({ path: `${SHOTS}/admin-overview.png`, fullPage: true });
  await admin.goto(`${BASE}/admin/request/?id=${code}`, { waitUntil: "networkidle0" });
  await waitText(admin, "Respond to this request");
  await admin.screenshot({ path: `${SHOTS}/admin-workspace.png`, fullPage: true });
  await click(admin, "Accept ₹2,000");
  await waitText(admin, "Quote sent");
  step("admin accepted ₹2,000");

  // 3. Student pays the advance
  await student.goto(`${BASE}/dashboard/request/?id=${code}`, { waitUntil: "networkidle0" });
  await click(student, "Pay ₹1,000");
  await student.waitForSelector("#utr");
  await student.type("#utr", utr());
  await click(student, "I've paid");
  await waitText(student, "Verifying");
  step("student submitted advance UTR");

  // 4. Admin verifies, chats, delivers
  await admin.reload({ waitUntil: "networkidle0" });
  await click(admin, "Received — verify");
  await waitText(admin, "Ready to deliver?");
  step("admin verified advance → in progress");
  await admin.type('textarea[aria-label="Message"]', "Here is the guidance doc and the fix for the 500 error.");
  await admin.click('button[aria-label="Send"]');
  await waitText(admin, "Here is the guidance doc");
  await click(admin, "Mark delivered");
  await waitText(admin, "Delivered — waiting for the student");
  step("admin messaged and marked delivered");

  // 5. Student sees message, pays balance
  await student.reload({ waitUntil: "networkidle0" });
  await waitText(student, "Here is the guidance doc");
  await waitText(student, "Your solution has been delivered");
  await click(student, "Pay ₹1,000");
  await student.waitForSelector("#utr");
  await student.type("#utr", utr());
  await click(student, "I've paid");
  await waitText(student, "Verifying");
  step("student saw delivery + paid balance");

  // 6. Admin verifies balance
  await admin.reload({ waitUntil: "networkidle0" });
  await click(admin, "Received — verify");
  await waitText(admin, "Fully paid");
  step("admin verified balance");

  // 7. Student completes + reviews
  await student.reload({ waitUntil: "networkidle0" });
  await click(student, "Mark complete");
  await waitText(student, "How was your experience?");
  await student.evaluate(() => document.querySelector('input[aria-label="5 stars"]').click());
  await student.type("#review-comment", "E2E test review — clear explanation and quick fix.");
  await click(student, "Submit review");
  await waitText(student, "Your review");
  await student.screenshot({ path: `${SHOTS}/student-completed.png`, fullPage: true });
  step("student completed + reviewed");

  // 8. Admin pages render
  for (const path of ["reviews", "payments", "students", "analytics", "settings", "coupons", "support", "audit"]) {
    await admin.goto(`${BASE}/admin/${path}/`, { waitUntil: "networkidle0" });
    await admin.waitForFunction(() => !document.querySelector('[role="status"][aria-label="Loading"]'), { timeout: 20000 });
  }
  await admin.goto(`${BASE}/admin/analytics/`, { waitUntil: "networkidle0" });
  await waitText(admin, "Revenue per day");
  await admin.screenshot({ path: `${SHOTS}/admin-analytics.png`, fullPage: true });
  step("all admin pages render");
} catch (e) {
  console.log("FAILED:", e.message);
  await student.screenshot({ path: `${SHOTS}/fail-student.png`, fullPage: true });
  await admin.screenshot({ path: `${SHOTS}/fail-admin.png`, fullPage: true });
  process.exitCode = 1;
} finally {
  console.log("REQUEST_CODE=" + code);
  if (errors.length) console.log("browser errors:\n  " + [...new Set(errors)].slice(0, 10).join("\n  "));
  await browser.close();
}
