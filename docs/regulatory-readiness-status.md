# Regulatory Readiness Status

Generated: 2026-02-22T19:28:33.307Z
Audit source: `docs/reports/repository-security-audit.json`

## Control coverage

- dependabot: **6.98%** (3/43)
- securityPolicy: **6.98%** (3/43)
- ciWorkflow: **6.98%** (3/43)
- securityWorkflow: **6.98%** (3/43)
- codeqlWorkflow: **2.33%** (1/43)
- sbomWorkflow: **0%** (0/43)
- secretScanWorkflow: **2.33%** (1/43)
- scorecardWorkflow: **2.33%** (1/43)
- installableDependencyModel: **6.98%** (3/43)

## Framework readiness

### EU Cyber Resilience Act (CRA) readiness
- Score: **5.58%**
- Status: **High risk**
- Control components:
  - securityPolicy: 6.98%
  - dependabot: 6.98%
  - securityWorkflow: 6.98%
  - sbomWorkflow: 0%
  - installableDependencyModel: 6.98%

### NIS2 software risk-management readiness
- Score: **5.12%**
- Status: **High risk**
- Control components:
  - securityPolicy: 6.98%
  - ciWorkflow: 6.98%
  - securityWorkflow: 6.98%
  - secretScanWorkflow: 2.33%
  - codeqlWorkflow: 2.33%

### SOC 2 / ISO 27001 DevSecOps readiness
- Score: **4.19%**
- Status: **High risk**
- Control components:
  - ciWorkflow: 6.98%
  - codeqlWorkflow: 2.33%
  - secretScanWorkflow: 2.33%
  - scorecardWorkflow: 2.33%
  - dependabot: 6.98%

## Highest-risk repositories (lowest compliance)

- arcadia: 0% (missing: dependabot, securityPolicy, ciWorkflow, securityWorkflow, codeqlWorkflow, sbomWorkflow, secretScanWorkflow, scorecardWorkflow, installableDependencyModel)
- atlas-ai: 0% (missing: dependabot, securityPolicy, ciWorkflow, securityWorkflow, codeqlWorkflow, sbomWorkflow, secretScanWorkflow, scorecardWorkflow, installableDependencyModel)
- central-plexus: 0% (missing: dependabot, securityPolicy, ciWorkflow, securityWorkflow, codeqlWorkflow, sbomWorkflow, secretScanWorkflow, scorecardWorkflow, installableDependencyModel)
- chronos-ai: 0% (missing: dependabot, securityPolicy, ciWorkflow, securityWorkflow, codeqlWorkflow, sbomWorkflow, secretScanWorkflow, scorecardWorkflow, installableDependencyModel)
- cornelius-ai: 0% (missing: dependabot, securityPolicy, ciWorkflow, securityWorkflow, codeqlWorkflow, sbomWorkflow, secretScanWorkflow, scorecardWorkflow, installableDependencyModel)
- dorris-ai: 0% (missing: dependabot, securityPolicy, ciWorkflow, securityWorkflow, codeqlWorkflow, sbomWorkflow, secretScanWorkflow, scorecardWorkflow, installableDependencyModel)
- echo-ai: 0% (missing: dependabot, securityPolicy, ciWorkflow, securityWorkflow, codeqlWorkflow, sbomWorkflow, secretScanWorkflow, scorecardWorkflow, installableDependencyModel)
- guardian-ai: 0% (missing: dependabot, securityPolicy, ciWorkflow, securityWorkflow, codeqlWorkflow, sbomWorkflow, secretScanWorkflow, scorecardWorkflow, installableDependencyModel)
- infinity-portal: 0% (missing: dependabot, securityPolicy, ciWorkflow, securityWorkflow, codeqlWorkflow, sbomWorkflow, secretScanWorkflow, scorecardWorkflow, installableDependencyModel)
- infrastructure: 0% (missing: dependabot, securityPolicy, ciWorkflow, securityWorkflow, codeqlWorkflow, sbomWorkflow, secretScanWorkflow, scorecardWorkflow, installableDependencyModel)
- iris-ai: 0% (missing: dependabot, securityPolicy, ciWorkflow, securityWorkflow, codeqlWorkflow, sbomWorkflow, secretScanWorkflow, scorecardWorkflow, installableDependencyModel)
- lille-sc-ai: 0% (missing: dependabot, securityPolicy, ciWorkflow, securityWorkflow, codeqlWorkflow, sbomWorkflow, secretScanWorkflow, scorecardWorkflow, installableDependencyModel)
- lunascene-ai: 0% (missing: dependabot, securityPolicy, ciWorkflow, securityWorkflow, codeqlWorkflow, sbomWorkflow, secretScanWorkflow, scorecardWorkflow, installableDependencyModel)
- mercury-ai: 0% (missing: dependabot, securityPolicy, ciWorkflow, securityWorkflow, codeqlWorkflow, sbomWorkflow, secretScanWorkflow, scorecardWorkflow, installableDependencyModel)
- nexus-ai: 0% (missing: dependabot, securityPolicy, ciWorkflow, securityWorkflow, codeqlWorkflow, sbomWorkflow, secretScanWorkflow, scorecardWorkflow, installableDependencyModel)

## Decision

Portfolio is **not yet fully production-ready** under modern supply-chain/security expectations. Continue remediation until all baseline controls and dependency model checks are green.
