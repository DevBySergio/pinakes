---
title: "Metrics"
type: reference
status: draft
order: 4
---
# Metrics

## Product Metrics

No telemetry is present in normal extension behavior, so product metrics must come from external signals that the team chooses to collect outside the extension.

| Metric | Source | Status |
| --- | --- | --- |
| Extension installs | Marketplace or distribution channel | Needs owner confirmation |
| Active repositories using Pinake | Repository audit or opt-in process | Needs owner confirmation |
| Command success/failure rate | Not collected by extension | Needs owner confirmation |
| User-reported setup friction | Issues, discussions, support channel | Needs owner confirmation |

## Engineering Metrics

| Metric | Source | Review cadence |
| --- | --- | --- |
| CI success rate | GitHub Actions | Per PR and main push |
| Test coverage by workflow | `src/test/extension.test.ts` review | Before release |
| Validation defect count | Validator output for sample and real workspaces | Before release |
| Template/module catalog drift | Tests and docs comparison | Before template changes |
| Dependency freshness | `package-lock.json` and security advisories | Needs owner confirmation |

## Operational Health

Pinake Editor has no production service runtime. Operational health means repository health, extension packaging health, and user workflow reliability inside VS Code.

## Review Cadence

- Per PR: compile, lint, tests, storage impact, docs impact.
- Before release: full manual smoke test and release checklist.
- After validation or storage bug: add regression tests and update troubleshooting docs.
