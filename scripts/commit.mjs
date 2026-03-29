#!/usr/bin/env node
/**
 * Commit wrapper — validates a message exists and delegates to git commit.
 * Version bumping is handled automatically by .githooks/prepare-commit-msg,
 * and tag creation by .githooks/post-commit, so both `git c` and plain
 * `git commit` behave identically.
 */
import { execSync } from "node:child_process";

const msg = process.argv.slice(2).join(" ").trim();
if (!msg) {
  console.error('Usage: npm run commit -- "your message [patch|minor|major]"');
  process.exit(1);
}

execSync(`git commit -m ${JSON.stringify(msg)}`, { stdio: "inherit" });
