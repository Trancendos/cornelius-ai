# cornelius-ai

Master AI Orchestrator

## Part of Luminous-MastermindAI Ecosystem

## Installation

```bash
pnpm install
```

## Development

```bash
pnpm dev
```

## Build and test

```bash
pnpm build
pnpm test
```

## Security and dependency governance

```bash
# Validate required security policy baseline files/scripts
pnpm run security:policy

# CVE gate (fails on high/critical vulnerabilities)
pnpm run security:cve

# Enforce N-0/N-1 package policy
pnpm run security:nminusone

# Generate CycloneDX SBOM
pnpm run security:sbom

# Run all local security controls
pnpm run security:all
```

## Cross-repository governance audit

This repository includes a GitHub-owner audit script that inventories
security baseline coverage and architecture anti-patterns.

```bash
pnpm run governance:audit

# Regulatory readiness summary
pnpm run governance:regulatory

# Final gap analysis + merge/separate recommendations
pnpm run governance:gap-analysis

# Initiate remediation backlog creation (dry-run by default)
pnpm run governance:initiate
```

By default this writes a JSON report to:

`docs/reports/repository-security-audit.json`

## License

MIT © Trancendos
