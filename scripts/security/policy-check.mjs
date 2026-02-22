#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";

const requiredFiles = [
  "SECURITY.md",
  ".github/dependabot.yml",
  ".github/workflows/ci-security.yml",
  ".github/workflows/codeql.yml",
  ".github/workflows/security-schedule.yml",
  ".github/workflows/sbom.yml",
  ".github/workflows/secrets-scan.yml",
  ".github/workflows/scorecards.yml",
];

const missingFiles = requiredFiles.filter((path) => !existsSync(path));

if (missingFiles.length > 0) {
  console.error("Security policy check failed. Missing required files:");
  for (const file of missingFiles) {
    console.error(`- ${file}`);
  }
  process.exit(1);
}

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const requiredScripts = [
  "security:policy",
  "security:cve",
  "security:nminusone",
  "security:sbom",
  "governance:audit",
  "governance:regulatory",
  "governance:gap-analysis",
  "governance:initiate",
];

const scriptEntries = packageJson.scripts ?? {};
const missingScripts = requiredScripts.filter((name) => !scriptEntries[name]);

if (missingScripts.length > 0) {
  console.error("Security policy check failed. Missing required npm scripts:");
  for (const scriptName of missingScripts) {
    console.error(`- ${scriptName}`);
  }
  process.exit(1);
}

console.log("Security policy check passed.");
