#!/usr/bin/env node
/**
 * Version-aware commit wrapper.
 * Usage: npm run commit -- "message [patch|minor|major]"
 *
 * Detects a version keyword, bumps package.json, stages it, then commits.
 * If no keyword is present, commits as-is.
 */
import { execSync } from "node:child_process";

const msg = process.argv.slice(2).join(" ").trim();
if (!msg) {
  console.error('Usage: npm run commit -- "your message [patch|minor|major]"');
  process.exit(1);
}

const bump = msg.includes("[major]")
  ? "major"
  : msg.includes("[minor]")
    ? "minor"
    : msg.includes("[patch]")
      ? "patch"
      : null;

if (bump) {
  execSync(`npm version ${bump} --no-git-tag-version`, { stdio: "inherit" });
  execSync("git add package.json package-lock.json", { stdio: "inherit" });
}

execSync(`git commit -m ${JSON.stringify(msg)}`, { stdio: "inherit" });
