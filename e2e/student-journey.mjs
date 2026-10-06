// E2E: guest posts a problem -> sees it in dashboard -> chats -> cancels.
// Usage: npm run build && npx serve out -l 4173, then `npm run test:e2e`.
// Creates one request in the configured Supabase project and cancels it.
import puppeteer from "puppeteer-core";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:4173";
const SHOTS = process.env.E2E_SHOTS_DIR ?? "e2e";
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: "new",
  defaultViewport: { width: 1280, height: 900 },
});
const page = await browser.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
page.on("console", (m) => m.type() === "error" && errors.push("console: " + m.text()));
page.on("dialog", (d) => d.accept());

const clickText = async (text, sel = "button") => {
  await page.waitForFunction(
    (t, s) => [...document.querySelectorAll(s)].some((el) => el.textContent.trim().startsWith(t) && !el.disabled),
    { timeout: 20000 }, text, sel);
  await page.evaluate((t, s) => [...document.querySelectorAll(s)].find((el) => el.textContent.trim().startsWith(t) && !el.disabled).click(), text, sel);
};
const step = (s) => console.log("•", s);

try {
  await page.goto(`${BASE}/post/`, { waitUntil: "networkidle0" });
  step("wizard loaded");
  await clickText("Coding", "label");
  await clickText("Continue");
  await page.type("#title", "E2E test: Python KeyError in dict loop");
  await page.type("#description", "Automated end-to-end test. My Python script throws KeyError when iterating a pandas dataframe and updating a dict.");
  await clickText("Continue");
  await clickText("Skip");
  await clickText("This week", "label");
  await clickText("Continue");
  await clickText("Continue"); // budget: let UniSolve suggest
  await clickText("Continue"); // privacy defaults
  await page.waitForFunction(() => document.body.innerText.includes("Estimated price"), { timeout: 20000 });
  const rec = await page.evaluate(() => document.querySelector("section[aria-live]")?.innerText.replace(/\s+/g, " "));
  step("recommendation: " + rec);
  await page.screenshot({ path: `${SHOTS}/e2e-review.png`, fullPage: true });
  await page.click('[role="checkbox"]');
  await clickText("Submit request");
  await page.waitForFunction(() => document.body.innerText.includes("Your request has been created."), { timeout: 30000 });
  const code = await page.evaluate(() => document.body.innerText.match(/US-\d{5,6}/)?.[0]);
  step("created " + code);
  await page.screenshot({ path: `${SHOTS}/e2e-success.png`, fullPage: true });

  await page.goto(`${BASE}/dashboard/`, { waitUntil: "networkidle0" });
  await page.waitForFunction((c) => document.body.innerText.includes(c), { timeout: 20000 }, code);
  step("dashboard lists the request");
  await page.screenshot({ path: `${SHOTS}/e2e-dashboard.png`, fullPage: true });

  await page.goto(`${BASE}/dashboard/request/?id=${code}`, { waitUntil: "networkidle0" });
  await page.waitForFunction(() => document.body.innerText.includes("Request Submitted"), { timeout: 20000 });
  step("request page + timeline");
  await page.type('textarea[aria-label="Message"]', "Hello from the E2E test");
  await page.click('button[aria-label="Send"]');
  await page.waitForFunction(() => document.body.innerText.includes("Hello from the E2E test"), { timeout: 20000 });
  step("chat message sent and shown");
  await page.screenshot({ path: `${SHOTS}/e2e-request.png`, fullPage: true });

  await clickText("Cancel");
  await page.waitForFunction(() => document.body.innerText.includes("Cancelled"), { timeout: 20000 });
  step("request cancelled (cleanup)");

  await page.goto(`${BASE}/track/?id=${code}&key=wrongkey123`, { waitUntil: "networkidle0" });
  await page.waitForFunction(() => document.body.innerText.includes("couldn't find"), { timeout: 20000 });
  step("tracking with wrong key shows not-found");

  await page.setViewport({ width: 390, height: 844, isMobile: true });
  await page.goto(`${BASE}/dashboard/request/?id=${code}`, { waitUntil: "networkidle0" });
  await page.waitForFunction(() => document.body.innerText.includes("Request Submitted"), { timeout: 20000 });
  await page.screenshot({ path: `${SHOTS}/e2e-mobile.png` });
  step("mobile request page rendered");
} catch (e) {
  console.log("FAILED:", e.message);
  await page.screenshot({ path: `${SHOTS}/e2e-failure.png`, fullPage: true });
  process.exitCode = 1;
} finally {
  if (errors.length) console.log("browser errors:\n  " + [...new Set(errors)].slice(0, 10).join("\n  "));
  await browser.close();
}
