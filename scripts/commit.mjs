#!/usr/bin/env node
/**
 * Thin wrapper around git commit — validates a message is provided.
 * Version bumping is handled by .githooks/prepare-commit-msg, so both
 * `git c "msg [patch]"` and `git commit -m "msg [patch]"` behave identically.
 */
import { execSync } from "node:child_process";

const msg = process.argv.slice(2).join(" ").trim();
if (!msg) {
  console.error('Usage: git c "your message [patch|minor|major]"');
  process.exit(1);
}

execSync(`git commit -m ${JSON.stringify(msg)}`, { stdio: "inherit" });
