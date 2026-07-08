---
name: pinake
description: Use when the user mentions Pinake or asks an AI agent to create, maintain, validate, search, extend, or organize project documentation with the Pinake VS Code extension.
license: MIT
---

# Pinake Documentation Skill

Use this skill when a workspace uses the Pinake VS Code extension, when `.pinake/` exists, or when the user asks to create or maintain project documentation with Pinake.

Pinake is a local-first documentation system. It stores generated and maintained project docs under `.pinake/docs`, keeps metadata in `.pinake/pinake.json`, and keeps extension state under `.pinake/.state`. Treat all content as workspace-local unless the user explicitly asks to publish, export, or commit it.

## Core Rules

- Prefer Pinake commands over ad hoc file creation when the VS Code command is available.
- Keep generated documentation practical, project-specific, and easy to maintain.
- Do not store secrets, tokens, private keys, credentials, or production-only sensitive values in Pinake documents.
- Preserve existing documentation unless the user explicitly asks you to replace it.
- After changing Pinake documents or metadata, validate the Pinake with `Pinakes: Validate` or the generated validator when available.
- Keep `.pinake/.state` as extension-owned state. Do not manually edit it unless the task is specifically about state repair or validation.

## Creating A Pinake

When the user asks to create project documentation:

1. Run `Pinakes: Create Pinake` or `Pinake: Create Documentation`.
2. Choose the documentation template that best matches the project:
   - Minimal Internal Docs for small projects and compact internal notes.
   - Product / Project Docs for product context, roadmap, changelog, and reference.
   - Technical Architecture for system context, architecture, quality, and ADRs.
   - API / Service Docs for services, APIs, SDKs, and backend projects.
   - Operations / Runbook for deployment, monitoring, backups, and incidents.
   - Full Product Handbook for a larger, complete internal documentation structure.
3. Keep default modules unless the repository clearly needs more or fewer sections.
4. Hide `.pinake` from the VS Code Explorer when the user wants a clean tree; show it when they prefer direct file access.
5. If a legacy `Pinake/` folder exists, copy it into `.pinake/docs` when preserving existing documentation matters.

## Maintaining Documents

Pinake documentation lives in `.pinake/docs`.

- Use `Pinakes: New Markdown File` for new documents.
- Use `Pinakes: New Folder` for new sections.
- Use `Pinakes: Search Documentation` before creating duplicate content.
- Use `Pinakes: Open Preview` for reading and `Pinakes: Edit` for source edits.
- Use `Pinakes: Show Properties` to inspect document metadata and paths.
- Keep frontmatter aligned with the document purpose:
  - `title` should be human-readable.
  - `type` should match the content, such as `overview`, `how-to`, `reference`, `architecture`, `adr`, `runbook`, `testing`, or `process`.
  - `status` should be `draft`, `in-review`, `stable`, or `deprecated`.
  - `order` should keep related documents in a useful sequence.

## Extending Coverage

When the user asks to document a technical area, run `Pinakes: Generate Module` when the built-in module matches the need. Use presets for common stacks, or select individual modules for targeted coverage.

Available generated modules may include API, Database, Docker, Kubernetes, CI/CD, Frontend, Mobile, and Authentication. After generating modules:

1. Review created files under `.pinake/docs`.
2. Replace placeholders with project-specific facts.
3. Keep examples minimal and accurate.
4. Validate the Pinake.

## Validation And CI

Use `Pinakes: Validate` after material changes. Validation checks Pinake structure, JSON metadata, document frontmatter, ADR naming, broken Markdown links, and Markdown style issues.

When the user wants automation:

1. Run `Pinakes: Generate CI Validation Workflow`.
2. Confirm `.pinake/tools/validate-pinake.mjs` and `.github/workflows/pinake-validate.yml` were created.
3. Run the validator locally when possible:
   - `node .pinake/tools/validate-pinake.mjs --format text`
   - `node .pinake/tools/validate-pinake.mjs --format json`
   - `node .pinake/tools/validate-pinake.mjs --format github`

## Verification Checklist

Before finishing a Pinake task:

- Search for nearby existing content to avoid duplicates.
- Confirm changed documents are under `.pinake/docs`.
- Confirm `.pinake/pinake.json` still references generated or added documents where needed.
- Run validation and report any remaining warnings or errors.
- Summarize the changed documents and any follow-up gaps.

