---
title: "Code Review"
type: process
status: draft
order: 1
---
# Code Review

## Review Goals

Review for user-visible correctness, storage compatibility, maintainability, validation coverage, and security/privacy impact. Pinake is a documentation tool, so changes that alter generated content or storage rules should be reviewed as product behavior, not only implementation detail.

## Required Evidence

| Change type | Evidence |
| --- | --- |
| Command behavior | Test or manual walkthrough in Extension Development Host. |
| Storage/manifest/state | Schema review, validation output, and tests for drift or migration. |
| Template/module docs | Generated file review and tests for ids, paths, and starter sections. |
| Validation | Positive and negative tests, plus standalone validator alignment. |
| TreeView UX | Screenshot or manual notes when labels, descriptions, icons, context values, or keybindings change. |
| Security-sensitive path | Threat review for filesystem scope, overwrite behavior, and sensitive data exposure. |

## Reviewer Checklist

- Are files written only to expected locations?
- Are user-authored documents preserved by default?
- Are manifest paths safe and normalized?
- Does the change keep command IDs stable or provide compatibility aliases?
- Do warnings and errors surface in the right VS Code surfaces?
- Do docs and README match the shipped behavior?
- Did tests cover the highest-risk paths?

## Escalation

| Area | Escalate to |
| --- | --- |
| Product direction or template defaults | Needs owner confirmation |
| Security/privacy policy | Needs owner confirmation |
| Release approval | Needs owner confirmation |
| Marketplace packaging | Needs owner confirmation |
