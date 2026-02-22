#!/usr/bin/env node

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { spawnSync } from "node:child_process";

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      args[key] = true;
      continue;
    }
    args[key] = next;
    i += 1;
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
const owner = String(args.owner ?? "").trim();
const limit = Number.parseInt(String(args.limit ?? "200"), 10);
const includeForks = Boolean(args["include-forks"]);
const outputPath = args.output ? String(args.output) : null;

if (!owner) {
  console.error("Missing required argument --owner <GitHub owner/org>.");
  process.exit(1);
}

function runGh(commandArgs, allowFailure = false) {
  const result = spawnSync("gh", commandArgs, { encoding: "utf8" });
  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    if (allowFailure) {
      return null;
    }
    const stderr = (result.stderr ?? "").trim();
    throw new Error(`gh ${commandArgs.join(" ")} failed: ${stderr}`);
  }

  return (result.stdout ?? "").trim();
}

function parseJson(text, fallback = null) {
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

function decodeBase64Json(base64Text) {
  const jsonText = Buffer.from(base64Text, "base64").toString("utf8");
  return parseJson(jsonText, null);
}

const reposRaw = runGh([
  "repo",
  "list",
  owner,
  "--limit",
  String(limit),
  "--json",
  "name,isFork,defaultBranchRef,description,url,updatedAt",
]);

const repos = parseJson(reposRaw, [])
  .filter((repo) => (includeForks ? true : !repo.isFork))
  .sort((a, b) => a.name.localeCompare(b.name));

const records = [];
const canonicalTemplateFiles = ["README.md", "package.json", "src/index.ts", "tsconfig.json"];

for (const repo of repos) {
  const branch = repo.defaultBranchRef?.name ?? "main";
  const treeRaw = runGh(
    ["api", `repos/${owner}/${repo.name}/git/trees/${branch}?recursive=1`],
    true,
  );

  if (!treeRaw) {
    records.push({
      repo: repo.name,
      url: repo.url,
      branch,
      error: "Unable to fetch repository tree.",
    });
    continue;
  }

  const tree = parseJson(treeRaw, {}).tree ?? [];
  const files = tree.filter((entry) => entry.type === "blob").map((entry) => entry.path);
  const fileSet = new Set(files);
  const workflowFiles = files.filter(
    (path) => path.startsWith(".github/workflows/") && (path.endsWith(".yml") || path.endsWith(".yaml")),
  );

  const hasPackageJson = fileSet.has("package.json");
  let hasWorkspaceSharedCore = false;

  if (hasPackageJson) {
    const packageBase64 = runGh(
      ["api", `repos/${owner}/${repo.name}/contents/package.json`, "--jq", ".content"],
      true,
    );
    if (packageBase64) {
      const packageJson = decodeBase64Json(packageBase64);
      const deps = packageJson?.dependencies ?? {};
      hasWorkspaceSharedCore = deps["@trancendos/shared-core"] === "workspace:*";
    }
  }

  const hasDependabot = fileSet.has(".github/dependabot.yml");
  const hasSecurityMd = fileSet.has("SECURITY.md");
  const hasCodeqlWorkflow = workflowFiles.some((path) => /codeql/i.test(path));
  const hasSecurityWorkflow = workflowFiles.some((path) =>
    /(security|vulnerability|sast|cve|audit)/i.test(path),
  );
  const hasCiWorkflow = workflowFiles.some((path) => /(ci|build|test)/i.test(path));

  const hasCanonicalTemplate = canonicalTemplateFiles.every((path) => fileSet.has(path));
  const isTemplateLike = hasCanonicalTemplate && files.length <= 10;

  records.push({
    repo: repo.name,
    url: repo.url,
    branch,
    updatedAt: repo.updatedAt,
    description: repo.description ?? "",
    fileCount: files.length,
    hasPackageJson,
    hasDependabot,
    hasSecurityMd,
    hasCodeqlWorkflow,
    hasSecurityWorkflow,
    hasCiWorkflow,
    hasWorkspaceSharedCore,
    isTemplateLike,
    workflowFiles,
  });
}

const validRecords = records.filter((item) => !item.error);
const summary = {
  owner,
  generatedAt: new Date().toISOString(),
  includeForks,
  totalRepos: repos.length,
  auditedRepos: validRecords.length,
  failedRepos: records.filter((item) => item.error).map((item) => item.repo),
  packageJsonRepos: validRecords.filter((item) => item.hasPackageJson).length,
  templateLikeRepos: validRecords.filter((item) => item.isTemplateLike).length,
  missingDependabot: validRecords.filter((item) => !item.hasDependabot).length,
  missingSecurityMd: validRecords.filter((item) => !item.hasSecurityMd).length,
  missingCodeqlWorkflow: validRecords.filter((item) => !item.hasCodeqlWorkflow).length,
  missingSecurityWorkflow: validRecords.filter((item) => !item.hasSecurityWorkflow).length,
  missingCiWorkflow: validRecords.filter((item) => !item.hasCiWorkflow).length,
  workspaceSharedCorePattern: validRecords.filter((item) => item.hasWorkspaceSharedCore).length,
};

const gaps = {
  missingDependabot: validRecords.filter((item) => !item.hasDependabot).map((item) => item.repo),
  missingSecurityMd: validRecords.filter((item) => !item.hasSecurityMd).map((item) => item.repo),
  missingCodeqlWorkflow: validRecords.filter((item) => !item.hasCodeqlWorkflow).map((item) => item.repo),
  missingSecurityWorkflow: validRecords.filter((item) => !item.hasSecurityWorkflow).map((item) => item.repo),
  missingCiWorkflow: validRecords.filter((item) => !item.hasCiWorkflow).map((item) => item.repo),
  workspaceSharedCorePattern: validRecords
    .filter((item) => item.hasWorkspaceSharedCore)
    .map((item) => item.repo),
  templateLikeRepos: validRecords.filter((item) => item.isTemplateLike).map((item) => item.repo),
};

const report = { summary, gaps, records };
const reportText = JSON.stringify(report, null, 2);

console.log(JSON.stringify(summary, null, 2));

if (outputPath) {
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, reportText, "utf8");
  console.log(`Saved audit report to ${outputPath}`);
}
