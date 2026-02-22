# Regulatory Compliance Control Matrix

This matrix maps implemented controls to common modern software-security expectations.

> Note: this is an engineering readiness mapping, not legal advice.

## Control-to-regulation mapping

| Control | EU CRA | NIS2 | SOC 2 / ISO 27001 | Implementation in this repo |
| --- | --- | --- | --- | --- |
| Vulnerability monitoring and patch cadence | Required | Required | Required | Dependabot + scheduled CVE workflow |
| Secure development lifecycle checks | Required | Required | Required | CI security gates + CodeQL |
| SBOM generation | Required | Strongly expected | Recommended | `sbom.yml` + `security:sbom` |
| Secrets detection | Required | Required | Required | `secrets-scan.yml` (gitleaks) |
| Supply-chain posture scoring | Recommended | Recommended | Recommended | `scorecards.yml` |
| Security policy / disclosure process | Required | Required | Required | `SECURITY.md` |
| Dependency freshness policy (N-0/N-1) | Recommended | Recommended | Recommended | `security:nminusone` script |
| Cross-repo governance evidence | Recommended | Required (governance evidence) | Required (auditable controls) | Governance audit + gap analysis scripts |

## Portfolio-level enforcement pattern

1. Run `pnpm run governance:audit` weekly.
2. Run `pnpm run governance:regulatory` to track framework readiness.
3. Run `pnpm run governance:gap-analysis` for executive reporting.
4. Run `pnpm run governance:initiate` to initiate remediation actions in non-compliant repositories.

## Production-ready definition

A repository is considered production-ready when all are true:

- Security baseline files/workflows are present.
- CI and security checks are required for merges.
- Dependency model is installable outside monorepo assumptions.
- SBOM and secrets scanning are automated.
- Ownership and integration contracts are documented.
