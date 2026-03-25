#!/usr/bin/env node
/**
 * Writes ../sw.js from ../sw.template.js, filling STATIC_ASSETS from:
 * - The transitive relative-import graph starting at src/app.js
 * - Every file under assets/ (icons, favicons, etc. not necessarily imported as modules)
 * - Shell URLs: ./, ./index.html, ./style.css, ./manifest.json
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const templatePath = path.join(root, "sw.template.js");
const outPath = path.join(root, "sw.js");

const FROM_IMPORT_RE = /from\s+['"](\.[^'"]+)['"]/g;

function toSiteUrl(absPath) {
  const rel = path.relative(root, absPath).split(path.sep).join("/");
  return rel === "" ? "./" : `./${rel}`;
}

function resolveImport(fromFile, spec) {
  const base = path.resolve(path.dirname(fromFile), spec);
  if (fs.existsSync(base) && fs.statSync(base).isFile()) return base;
  const withJs = `${base}.js`;
  if (fs.existsSync(withJs)) return withJs;
  return null;
}

function collectJsFromEntry(entryAbs) {
  const visited = new Set();
  const queue = [entryAbs];

  while (queue.length) {
    const abs = queue.shift();
    if (!abs || visited.has(abs)) continue;
    visited.add(abs);

    let text;
    try {
      text = fs.readFileSync(abs, "utf8");
    } catch {
      continue;
    }

    let m;
    FROM_IMPORT_RE.lastIndex = 0;
    while ((m = FROM_IMPORT_RE.exec(text)) !== null) {
      const spec = m[1];
      if (!spec.startsWith(".")) continue;
      const resolved = resolveImport(abs, spec);
      if (resolved && resolved.endsWith(".js")) queue.push(resolved);
    }
  }

  return visited;
}

function collectAssetFiles() {
  const assetsRoot = path.join(root, "assets");
  if (!fs.existsSync(assetsRoot)) return [];
  const out = [];
  function walk(dir) {
    for (const name of fs.readdirSync(dir)) {
      const p = path.join(dir, name);
      const st = fs.statSync(p);
      if (st.isDirectory()) walk(p);
      else out.push(p);
    }
  }
  walk(assetsRoot);
  return out;
}

function main() {
  const entry = path.join(root, "src", "app.js");
  if (!fs.existsSync(entry)) {
    console.error("generate-sw: missing", entry);
    process.exit(1);
  }

  const jsFiles = collectJsFromEntry(entry);
  const shell = [
    path.join(root, "index.html"),
    path.join(root, "style.css"),
    path.join(root, "manifest.json"),
  ];

  for (const p of shell) {
    if (!fs.existsSync(p)) {
      console.error("generate-sw: expected file missing:", p);
      process.exit(1);
    }
  }

  const urls = new Set();
  urls.add("./");
  urls.add("./index.html");
  urls.add("./style.css");
  urls.add("./manifest.json");

  for (const abs of jsFiles) urls.add(toSiteUrl(abs));
  for (const abs of collectAssetFiles()) urls.add(toSiteUrl(abs));

  const sorted = [...urls].sort((a, b) => a.localeCompare(b));

  let template = fs.readFileSync(templatePath, "utf8");
  if (!template.includes("__STATIC_ASSETS__")) {
    console.error(
      "generate-sw: sw.template.js must contain __STATIC_ASSETS__ placeholder",
    );
    process.exit(1);
  }

  const replacement = JSON.stringify(sorted, null, 2);
  const out = template.replace("__STATIC_ASSETS__", replacement);

  fs.writeFileSync(outPath, out, "utf8");
  console.log(`generate-sw: wrote ${sorted.length} URLs to sw.js`);
}

main();
