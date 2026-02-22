# Security Policy

## Supported Versions

This repository follows an **N-0/N-1 dependency policy**:

- **N-0**: latest stable major versions are preferred.
- **N-1**: one major behind latest is temporarily accepted.
- Anything older than N-1 is non-compliant and must be remediated.

## Reporting a Vulnerability

If you discover a security issue:

1. Do **not** open a public issue with exploit details.
2. Report it privately to the repository maintainers through GitHub security reporting or a trusted private channel.
3. Include:
   - affected component(s)
   - impact assessment
   - reproduction steps
   - suggested remediation (if known)

We will triage, mitigate, and publish fixes according to severity.

## Security Controls Enabled

- Automated dependency updates via Dependabot.
- Pull-request dependency risk checks.
- CodeQL static analysis.
- Scheduled CVE audit gate (`high` and `critical` vulnerabilities fail checks).
- N-0/N-1 dependency compliance check.
- SBOM generation for software supply-chain visibility.
- Automated secret scanning.
- OSSF scorecard supply-chain posture checks.
