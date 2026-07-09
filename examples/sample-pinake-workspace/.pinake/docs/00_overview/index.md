---
title: "Overview"
type: overview
status: draft
order: 1
---

# Overview

This sample demonstrates the smallest useful Pinake structure: a manifest plus Markdown files under `.pinake/docs`.

## Purpose

Use this workspace to inspect the file contract without running the creation wizard.

## Project Snapshot

| Field | Value |
| --- | --- |
| Primary users | Documentation authors and automation maintainers |
| Maintainers | Pinake extension contributors |
| Source of truth | `.pinake/pinake.json` plus Markdown under `.pinake/docs` |

## Success Signals

- The workspace opens in VS Code with Pinake Editor installed.
- `Pinake: Validate` reports the sample manifest and Markdown as valid.
- The sidebar can show the sample documents from the manifest.

## Review Notes

- Keep this example intentionally small.
- Update it when the manifest contract or required frontmatter changes.
