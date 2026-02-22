#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import semver from "semver";

const packageJson = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8"));
const sections = ["dependencies", "devDependencies"];
const cache = new Map();
const skippedProtocols = [
  "workspace:",
  "file:",
  "link:",
  "git+",
  "github:",
  "http:",
  "https:",
];

function shouldSkipRange(range) {
  if (!range || typeof range !== "string") return true;
  if (range === "*" || range === "latest") return true;
  return skippedProtocols.some((prefix) => range.startsWith(prefix));
}

function fetchLatestVersion(pkgName) {
  if (cache.has(pkgName)) {
    return cache.get(pkgName);
  }

  const result = spawnSync("npm", ["view", pkgName, "version", "--json"], {
    encoding: "utf8",
  });

  if (result.error || result.status !== 0) {
    cache.set(pkgName, null);
    return null;
  }

  const raw = (result.stdout ?? "").trim();
  if (!raw) {
    cache.set(pkgName, null);
    return null;
  }

  let parsed = null;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = raw;
  }

  const latest = typeof parsed === "string" ? parsed : null;
  if (!latest || !semver.valid(latest)) {
    cache.set(pkgName, null);
    return null;
  }

  cache.set(pkgName, latest);
  return latest;
}

const rows = [];
const warnings = [];

for (const section of sections) {
  const deps = packageJson[section] ?? {};
  for (const [name, range] of Object.entries(deps)) {
    if (shouldSkipRange(range)) {
      warnings.push(`Skipped ${name}@${range} (${section}) due to non-registry/non-semver source.`);
      continue;
    }

    const minVersion = semver.minVersion(range);
    if (!minVersion) {
      warnings.push(`Skipped ${name}@${range} (${section}) because range is not semver-parseable.`);
      continue;
    }

    const latest = fetchLatestVersion(name);
    if (!latest) {
      warnings.push(`Skipped ${name}@${range} (${section}) because latest npm version is unavailable.`);
      continue;
    }

    const latestMajor = semver.major(latest);
    const minMajor = semver.major(minVersion);
    const minAllowedMajor = Math.max(0, latestMajor - 1);

    let status = "OUT-OF-POLICY";
    if (minMajor === latestMajor) status = "N-0";
    if (minMajor === latestMajor - 1) status = "N-1";

    rows.push({
      section,
      name,
      range,
      minVersion: minVersion.version,
      latest,
      status,
      compliant: minMajor >= minAllowedMajor,
    });
  }
}

for (const row of rows) {
  console.log(
    `${row.section.padEnd(15)} ${row.name.padEnd(20)} ${row.range.padEnd(12)} latest=${row.latest.padEnd(8)} status=${row.status}`,
  );
}

if (warnings.length > 0) {
  console.log("\nWarnings:");
  for (const warning of warnings) {
    console.log(`- ${warning}`);
  }
}

const violations = rows.filter((row) => !row.compliant);
if (violations.length > 0) {
  console.error("\nN-0/N-1 compliance failed for the following packages:");
  for (const item of violations) {
    console.error(`- ${item.name}: ${item.range} (latest: ${item.latest})`);
  }
  process.exit(1);
}

console.log("\nN-0/N-1 compliance check passed.");
