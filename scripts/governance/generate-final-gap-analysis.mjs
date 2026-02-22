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

function daysFromNow(days) {
  const value = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  return value.toISOString().slice(0, 10);
}

const args = parseArgs(process.argv.slice(2));
const owner = String(args.owner ?? "unknown-owner");
const reportPath = String(args.report ?? "docs/reports/repository-security-audit.json");
const outputPath = String(args.output ?? "docs/final-gap-analysis.md");

const report = loadReport(reportPath);
const records = (report.records ?? []).filter((item) => !item.error);
const totalRepos = records.length;

if (totalRepos === 0) {
  throw new Error("No repository records available.");
}

const controlKeys = [
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

const controlCoverage = controlKeys.map((control) => {
  const count = records.filter((record) => Boolean(record.controls?.[control])).length;
  const percent = Number(((count / totalRepos) * 100).toFixed(2));
  return { control, count, percent };
});

const worstRepos = [...records]
  .sort((a, b) => a.compliancePercent - b.compliancePercent)
  .slice(0, 20);

const dependencyModelGaps = records.filter(
  (record) => !Boolean(record.controls?.installableDependencyModel),
);
const templateRepos = records.filter((record) => record.isTemplateLike);
const matureRepos = records.filter((record) => !record.isTemplateLike);
const productionReadyRepos = records.filter((record) => record.productionReady);

const mergeCandidates = templateRepos
  .filter((record) => record.compliancePercent <= 50)
  .map((record) => record.repo);
const keepSeparateCandidates = matureRepos.map((record) => record.repo);

const now = new Date().toISOString();
const lines = [];
lines.push("# Final Gap Analysis and Production-Readiness Plan");
lines.push("");
lines.push(`Generated: ${now}`);
lines.push(`Owner: \`${owner}\``);
lines.push(`Audit source: \`${reportPath}\``);
lines.push("");
lines.push("## Executive result");
lines.push("");
lines.push(
  `- Repositories assessed: **${totalRepos}**`,
);
lines.push(
  `- Fully production-ready under defined control set: **${productionReadyRepos.length}/${totalRepos}**`,
);
lines.push(
  `- Repositories with dependency architecture blocker (workspace shared-core pattern): **${dependencyModelGaps.length}/${totalRepos}**`,
);
lines.push(
  `- Template-like repositories: **${templateRepos.length}/${totalRepos}**`,
);
lines.push("");
lines.push(
  "Current status: **not production-ready portfolio-wide**. Centralized remediation and repo rationalization remain mandatory.",
);
lines.push("");
lines.push("## Control coverage matrix");
lines.push("");
for (const row of controlCoverage) {
  lines.push(`- ${row.control}: **${row.percent}%** (${row.count}/${totalRepos})`);
}
lines.push("");
lines.push("## Brainstorming session outcomes");
lines.push("");
lines.push("### Option A - Keep every repo independent");
lines.push("- Pros: maximal autonomy.");
lines.push("- Cons: highest governance overhead and repeated security drift.");
lines.push("");
lines.push("### Option B - Consolidate template repos into an incubator monorepo");
lines.push("- Pros: one security baseline, one CI surface, lower maintenance overhead.");
lines.push("- Cons: migration effort and short-term disruption.");
lines.push("");
lines.push("### Option C - Hybrid (chosen)");
lines.push(
  "- Keep mature/active repos independent, but merge template-only repos into an incubator until maturity gates are met.",
);
lines.push(
  "- Rationale: preserves modular architecture where justified while eliminating fragmented scaffolds.",
);
lines.push("");
lines.push("## Merge/separate recommendation");
lines.push("");
lines.push("### Keep separate (current maturity)");
for (const repo of keepSeparateCandidates) {
  lines.push(`- ${repo}`);
}
lines.push("");
lines.push("### Merge/Consolidate first");
for (const repo of mergeCandidates) {
  lines.push(`- ${repo}`);
}
lines.push("");
lines.push("## Highest-priority repository gaps");
lines.push("");
for (const repo of worstRepos) {
  const missingControls = Object.entries(repo.controls ?? {})
    .filter(([, enabled]) => !enabled)
    .map(([key]) => key);
  lines.push(
    `- ${repo.repo} (${repo.compliancePercent}%): missing ${missingControls.join(", ")}`,
  );
}
lines.push("");
lines.push("## Required remaining steps (initiated)");
lines.push("");
lines.push("1. Enable missing baseline controls in every repo (Dependabot, SECURITY.md, CI, security workflows, CodeQL).");
lines.push("2. Add SBOM, secret scanning, and scorecards across all repos.");
lines.push("3. Remove `workspace:*` dependency anti-pattern in all affected repos.");
lines.push("4. Apply branch protections with required status checks.");
lines.push("5. Archive or merge non-mature template repos based on ownership and roadmap.");
lines.push("");
lines.push("## Grand timeline");
lines.push("");
lines.push(`- Phase 0 (now -> ${daysFromNow(2)}): critical dependency model fixes + baseline controls`);
lines.push(`- Phase 1 (${daysFromNow(3)} -> ${daysFromNow(10)}): regulatory controls (SBOM, secrets, scorecards, branch protection)`);
lines.push(`- Phase 2 (${daysFromNow(11)} -> ${daysFromNow(24)}): repo rationalization (merge/archive/promote)`);
lines.push(`- Phase 3 (${daysFromNow(25)} -> ${daysFromNow(42)}): integration contracts + contract testing`);
lines.push(`- Phase 4 (${daysFromNow(43)} onward): weekly audit, monthly executive review, continuous compliance`);
lines.push("");
lines.push("## Completion gate");
lines.push("");
lines.push("- `productionReadyRepos` must equal total repos.");
lines.push("- No repo may retain `workspace:*` shared-core dependency pattern.");
lines.push("- Every kept-separate repo must have explicit owner, SLO, and integration contract.");
lines.push("");

const text = lines.join("\n");
mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, text, "utf8");
console.log(text);
console.log(`Saved final gap analysis to ${outputPath}`);
