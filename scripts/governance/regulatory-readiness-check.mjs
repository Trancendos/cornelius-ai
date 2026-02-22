#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      args[key] = true;
      continue;
    }
    args[key] = value;
    index += 1;
  }
  return args;
}

function loadReport(path) {
  if (!existsSync(path)) {
    throw new Error(`Audit report not found at ${path}. Run governance:audit first.`);
  }
  return JSON.parse(readFileSync(path, "utf8"));
}

function percentage(value) {
  return Number((value * 100).toFixed(2));
}

const args = parseArgs(process.argv.slice(2));
const reportPath = String(args.report ?? "docs/reports/repository-security-audit.json");
const outputPath = args.output ? String(args.output) : null;

const report = loadReport(reportPath);
const records = (report.records ?? []).filter((item) => !item.error);
const repoCount = records.length;

if (repoCount === 0) {
  throw new Error("No repositories available in report.");
}

const controlNames = [
  "dependabot",
  "securityPolicy",
  "ciWorkflow",
  "securityWorkflow",
  "codeqlWorkflow",
  "sbomWorkflow",
  "secretScanWorkflow",
  "scorecardWorkflow",
  "installableDependencyModel",
];

const controlCoverage = {};
for (const control of controlNames) {
  const hits = records.filter((record) => Boolean(record.controls?.[control])).length;
  controlCoverage[control] = {
    repos: hits,
    total: repoCount,
    coveragePercent: percentage(hits / repoCount),
  };
}

const frameworks = [
  {
    name: "EU Cyber Resilience Act (CRA) readiness",
    controls: [
      "securityPolicy",
      "dependabot",
      "securityWorkflow",
      "sbomWorkflow",
      "installableDependencyModel",
    ],
  },
  {
    name: "NIS2 software risk-management readiness",
    controls: [
      "securityPolicy",
      "ciWorkflow",
      "securityWorkflow",
      "secretScanWorkflow",
      "codeqlWorkflow",
    ],
  },
  {
    name: "SOC 2 / ISO 27001 DevSecOps readiness",
    controls: [
      "ciWorkflow",
      "codeqlWorkflow",
      "secretScanWorkflow",
      "scorecardWorkflow",
      "dependabot",
    ],
  },
];

const frameworkResults = frameworks.map((framework) => {
  const controlResults = framework.controls.map((control) => ({
    control,
    coveragePercent: controlCoverage[control].coveragePercent,
  }));
  const score =
    controlResults.reduce((sum, row) => sum + row.coveragePercent, 0) / controlResults.length;
  const readinessScore = Number(score.toFixed(2));
  let status = "High risk";
  if (readinessScore >= 95) status = "Ready";
  else if (readinessScore >= 80) status = "Near ready";
  else if (readinessScore >= 60) status = "Partially ready";

  return {
    name: framework.name,
    readinessScore,
    status,
    controls: controlResults,
  };
});

const weakestRepos = [...records]
  .sort((a, b) => a.compliancePercent - b.compliancePercent)
  .slice(0, 15)
  .map((item) => ({
    repo: item.repo,
    compliancePercent: item.compliancePercent,
    missingControls: Object.entries(item.controls ?? {})
      .filter(([, value]) => !value)
      .map(([key]) => key),
  }));

const lines = [];
lines.push("# Regulatory Readiness Status");
lines.push("");
lines.push(`Generated: ${new Date().toISOString()}`);
lines.push(`Audit source: \`${reportPath}\``);
lines.push("");
lines.push("## Control coverage");
lines.push("");
for (const control of controlNames) {
  const row = controlCoverage[control];
  lines.push(`- ${control}: **${row.coveragePercent}%** (${row.repos}/${row.total})`);
}
lines.push("");
lines.push("## Framework readiness");
lines.push("");
for (const framework of frameworkResults) {
  lines.push(`### ${framework.name}`);
  lines.push(`- Score: **${framework.readinessScore}%**`);
  lines.push(`- Status: **${framework.status}**`);
  lines.push("- Control components:");
  for (const control of framework.controls) {
    lines.push(`  - ${control.control}: ${control.coveragePercent}%`);
  }
  lines.push("");
}
lines.push("## Highest-risk repositories (lowest compliance)");
lines.push("");
for (const repo of weakestRepos) {
  lines.push(
    `- ${repo.repo}: ${repo.compliancePercent}% (missing: ${repo.missingControls.join(", ")})`,
  );
}
lines.push("");
lines.push("## Decision");
lines.push("");
lines.push(
  "Portfolio is **not yet fully production-ready** under modern supply-chain/security expectations. Continue remediation until all baseline controls and dependency model checks are green.",
);
lines.push("");

const outputText = lines.join("\n");
console.log(outputText);

if (outputPath) {
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, outputText, "utf8");
  console.log(`Saved regulatory readiness report to ${outputPath}`);
}
