# Repository Security + Architecture Action Plan

Generated: 2026-02-22  
Method: live GitHub API audit (`scripts/governance/audit-repositories.mjs --owner Trancendos`)

## 1) Scope reviewed

- Owner scanned: `Trancendos`
- First-party repos (non-forks) analyzed: **43**
- Package-managed repos found: **43** (all include `package.json`)

## 2) Current-state findings (gaps)

### Security baseline coverage

- Missing Dependabot config: **41 / 43**
- Missing SECURITY.md policy: **41 / 43**
- Missing CodeQL workflow: **42 / 43**
- Missing security workflow (audit/CVE/SAST): **41 / 43**
- Missing CI workflow (build/test): **41 / 43**

Only `trancendos-ecosystem` has broad baseline coverage today.  
`secrets-portal` has partial baseline controls.

### Dependency architecture gap

- Repos with `@trancendos/shared-core: "workspace:*"` in dependencies: **40 / 43**
- This pattern fails in standalone repositories and blocks install/audit in isolated CI contexts.

### Modularity/portfolio structure gap

- Template-like repos: **41 / 43**
- Most repos are near-identical scaffolds with minimal domain logic.
- Portfolio intent is modular services, but current implementation is mostly duplicated shell repos.

## 3) What was implemented in this repository (`cornelius-ai`)

### Security and governance controls added

- Dependabot configuration (`.github/dependabot.yml`)
- CI + security workflow (`.github/workflows/ci-security.yml`)
- Scheduled security workflow (`.github/workflows/security-schedule.yml`)
- CodeQL workflow (`.github/workflows/codeql.yml`)
- Cross-repo governance audit workflow (`.github/workflows/governance-audit.yml`)
- Security policy (`SECURITY.md`)
- CVE checker script (`scripts/security/cve-check.mjs`)
- N-0/N-1 dependency compliance script (`scripts/security/nminusone-check.mjs`)
- Cross-repository baseline audit script (`scripts/governance/audit-repositories.mjs`)

### Dependency hardening completed

- Removed blocking standalone dependency pattern from direct deps:
  - `@trancendos/shared-core: "workspace:*"` moved to optional peer-dependency contract.
- Updated dependencies to current latest (N-0 at time of change).
- Added lockfile + package manager pinning.

## 4) Required actions by repository cohort

## Cohort A: Core active repos (keep separate)

- `trancendos-ecosystem`
- `secrets-portal`
- `the-void` (small but non-template behavior)

Required:
1. Enforce baseline controls (Dependabot, CodeQL, CVE workflow, SECURITY.md, CI).
2. Add branch protections + required security checks.
3. Publish integration contracts (OpenAPI/events/package interface).

## Cohort B: Shared platform repo (keep separate)

- `shared-core`

Required:
1. Remove self-referential `workspace:*` dependency anti-pattern.
2. Publish versioned package artifacts (npm/GitHub Packages).
3. Define semantic versioning + changelog policy.

## Cohort C: Template-like service repos (merge candidate until mature)

Includes most `*-ai` and `the-*` repos currently containing scaffold-only code.

Required:
1. Consolidate into one incubator/workspace repo OR generate from template on demand.
2. Promote to standalone repo only when service passes maturity gate:
   - unique domain logic
   - independent deployment
   - owned SLO + on-call path
   - security baseline complete

## 5) Merge vs separate recommendation

### Merge now

Merge/scaffold-consolidate template-only repos into one controlled workspace (or archive them) to reduce:
- duplicated maintenance,
- fragmented security posture,
- inconsistent dependency updates.

### Keep separate

Keep repos separate only where there is real autonomy and production responsibility:
- `trancendos-ecosystem`
- `secrets-portal`
- `the-void`
- `shared-core` (as published shared library)

## 6) Grand timeline

## Phase 0 (Day 0-2): Stabilize security blockers

- Roll out the `workspace:*` dependency fix pattern across all affected repos.
- Add `.github/dependabot.yml` and SECURITY.md everywhere.
- Enable CI + CVE checks in all first-party repos.

**Exit criteria:** all repos install cleanly and can run dependency audits.

## Phase 1 (Week 1): Baseline enforcement

- Enable CodeQL + dependency-review across all repos.
- Turn on branch protection requiring:
  - build/test
  - CVE gate
  - dependency review

**Exit criteria:** no direct merge to default branch without security gates.

## Phase 2 (Week 2-3): Portfolio rationalization

- Classify each template repo: archive, incubator-merge, or promote.
- Implement a single canonical service template + generator workflow.

**Exit criteria:** no duplicated empty repos without ownership and roadmap.

## Phase 3 (Week 4-6): Modularity with explicit integration contracts

- For repos kept separate, define APIs/events and compatibility matrix.
- Add contract/integration tests between modules.
- Publish architecture map and ownership matrix.

**Exit criteria:** modular repos interact through versioned contracts, not implicit coupling.

## Phase 4 (Ongoing): Proactive governance

- Weekly automated portfolio audit (`governance-audit` workflow).
- Monthly executive review:
  - open vulnerabilities,
  - N-0/N-1 compliance,
  - repo sprawl score,
  - archive/promote decisions.

## 7) Completion review rubric (re-run any time)

Use:

```bash
pnpm run governance:audit
```

Completion is achieved when:

- Missing Dependabot = 0
- Missing SECURITY.md = 0
- Missing CodeQL workflow = 0
- Missing security workflow = 0
- Missing CI workflow = 0
- `workspace:*` shared-core anti-pattern = 0
- Template repos have explicit disposition (archive/merge/promote)
