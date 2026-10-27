// Static check: user-facing text lives only in messages/<locale>/. Fails on Hebrew or Arabic letters in code
// under app/, components/ and lib/ (comments are ignored). Data that is Hebrew on purpose (city names stored in
// the database, header aliases for spreadsheet import, demo data) is marked with `i18n-data` on the line, or
// `i18n-data-file` anywhere in the file. The em dash is banned everywhere in the app, messages included (owner's rule).
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const SCRIPT = /[֐-׿؀-ۿ]/;
const bad = [];

function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(tsx?|mjs)$/.test(e.name)) check(p);
  }
}

function check(file) {
  const src = fs.readFileSync(file, "utf8");
  src.split("\n").forEach((line, i) => { if (line.includes("\u2014")) bad.push(`${path.relative(ROOT, file)}:${i + 1}: em dash (use a comma, colon or full stop)`); });
  if (src.includes("i18n-data-file")) return;
  // drop block comments, keeping line numbers
  const code = src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));
  code.split("\n").forEach((line, i) => {
    if (line.includes("i18n-data")) return;
    const stripped = line.replace(/(^|[^:"'`])\/\/.*$/, "$1").replace(/\{\/\*.*?\*\/\}/g, "");
    if (SCRIPT.test(stripped)) bad.push(`${path.relative(ROOT, file)}:${i + 1}: ${line.trim().slice(0, 110)}`);
  });
}

for (const d of ["app", "components", "lib"]) walk(path.join(ROOT, d));
// messages may (must) contain Hebrew and Arabic, but never an em dash
(function dashes(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) dashes(p);
    else fs.readFileSync(p, "utf8").split("\n").forEach((line, i) => { if (line.includes("\u2014")) bad.push(`${path.relative(ROOT, p)}:${i + 1}: em dash`); });
  }
})(path.join(ROOT, "messages"));
if (bad.length) {
  console.error(`Text outside messages/ (${bad.length} lines). Move it to messages/<locale>/, or mark real data with i18n-data:\n`);
  console.error(bad.join("\n"));
  process.exitCode = 1;
} else console.log("OK: all user-facing text is in messages/");
