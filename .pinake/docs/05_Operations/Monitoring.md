---
title: "Monitoring"
type: runbook
status: draft
order: 6
---
# Monitoring

## Runtime Model

Pinake Editor has no hosted runtime and no telemetry in normal extension behavior. Monitoring is based on repository signals, CI health, release smoke checks, and user-reported issues.

## Signals

| Signal | Source | Response |
| --- | --- | --- |
| CI failures | GitHub Actions | Fix compile, lint, test, or environment issue before merge. |
| Validation failures | Pinake validator or Problems panel | Fix errors, review warnings, update docs or manifest. |
| User bug reports | Issue tracker or support channel | Reproduce in Extension Development Host and add regression coverage. |
| Release smoke failure | Manual release checklist | Stop release, fix or document known limitation. |
| Dependency advisory | Package ecosystem tooling | Assess impact and update dependency safely. |

## Dashboards

No dashboards are defined in the repository. Marketplace analytics, issue triage dashboards, or CI trend dashboards need owner confirmation before they can be documented as operational sources.

## Alerting

No automated operational alerting is defined for this extension. CI failures on protected branches should be treated as the primary automated quality signal if branch protection is configured.

## Review Cadence

- Per PR: review CI result and relevant validation output.
- Before release: complete manual VS Code smoke test.
- After user-reported defect: add a regression test or explicit troubleshooting note.
