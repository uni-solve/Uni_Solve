// QA sweep: every public page at phone + desktop width.
// Flags console errors, horizontal overflow, missing <title>/<h1>, unlabeled
// buttons/links/images. Usage: build + `npx serve out -l 4173`, then
// `node e2e/qa-sweep.mjs`.
import puppeteer from "puppeteer-core";
import { readFileSync } from "node:fs";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:4173";
const sitemap = readFileSync("out/sitemap.xml", "utf8");
const paths = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname.replace(/^\/Uni_Solve/, ""));
paths.push("/post/", "/track/", "/login/", "/signup/", "/forgot-password/", "/styleguide/", "/does-not-exist/");

const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: "new",
});
const viewports = [
  { name: "phone", width: 360, height: 780, isMobile: true, hasTouch: true },
  { name: "desktop", width: 1280, height: 900 },
];
let problems = 0;

for (const vp of viewports) {
  const page = await browser.newPage();
  await page.setViewport(vp);
  for (const path of [...new Set(paths)]) {
    const errors = [];
    const onConsole = (m) => m.type() === "error" && !/404 \(Not Found\)|Failed to load resource/.test(m.text()) && errors.push(m.text());
    const onError = (e) => errors.push(e.message);
    page.on("console", onConsole);
    page.on("pageerror", onError);
    await page.goto(BASE + path, { waitUntil: "networkidle0" });
    const report = await page.evaluate(() => {
      const issues = [];
      const doc = document.documentElement;
      if (doc.scrollWidth > window.innerWidth + 1) {
        const wide = [...document.querySelectorAll("body *")].find((el) => el.getBoundingClientRect().right > window.innerWidth + 1 && getComputedStyle(el).position !== "fixed");
        issues.push(`horizontal overflow (${doc.scrollWidth}px) e.g. <${wide?.tagName.toLowerCase()} class="${wide?.className?.toString().slice(0, 60)}">`);
      }
      if (!document.title) issues.push("missing <title>");
      if (!document.querySelector("h1")) issues.push("no <h1>");
      const name = (el) => (el.getAttribute("aria-label") || el.textContent || el.getAttribute("title") || "").trim();
      for (const el of document.querySelectorAll("button, a[href]")) {
        if (el.closest("[aria-hidden=true]") || el.offsetParent === null) continue;
        if (!name(el)) issues.push(`unlabeled <${el.tagName.toLowerCase()}> ${el.outerHTML.slice(0, 80)}`);
      }
      for (const img of document.querySelectorAll("img")) if (!img.hasAttribute("alt")) issues.push("img without alt");
      return { issues, title: document.title };
    });
    page.off("console", onConsole);
    page.off("pageerror", onError);
    const all = [...report.issues, ...errors.map((e) => "console: " + e.slice(0, 140))];
    if (all.length) {
      problems += all.length;
      console.log(`✗ [${vp.name}] ${path}\n    ${[...new Set(all)].join("\n    ")}`);
    }
  }
  await page.close();
}
console.log(`\nChecked ${new Set(paths).size} pages × ${viewports.length} viewports — ${problems} issue(s).`);
await browser.close();
process.exitCode = problems ? 1 : 0;
