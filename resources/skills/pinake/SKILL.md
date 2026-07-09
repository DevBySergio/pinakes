---
name: pinake
description: Use when the user mentions Pinake or asks an AI agent to create, maintain, validate, search, extend, import, export, repair, or organize project documentation with the Pinake VS Code extension, including choosing documentation templates, generating modules, updating `.pinake/docs`, repairing manifests/frontmatter, and preparing validation or CI.
---

# Pinake Documentation Automation

Use this skill to create and maintain source-backed project documentation with Pinake. Pinake is local-first: Markdown lives in `.pinake/docs`, metadata lives in `.pinake/pinake.json`, and generated extension state lives in `.pinake/.state`.

## Core Rules

- Prefer Pinake commands when the VS Code extension command surface is available; otherwise edit files directly using `references/manual-storage-contract.md`.
- Preserve existing authored documentation. Add, repair, restructure, or extend without overwriting user-written content unless the user explicitly asks for replacement.
- Derive facts from repository evidence. Mark unknown owners, environments, deployment targets, and external systems as needing confirmation instead of inventing them.
- Do not store secrets, tokens, private keys, credentials, production customer data, raw incident evidence, or real environment files in Pinake documents.
- Keep `.pinake/.state` extension-owned. Use repair, scaffold, upgrade, module generation, or generated tooling to recreate state files.
- Validate after material changes and report changed files, remaining warnings, skipped work, and follow-up gaps.

## References And Scripts

Read only the reference needed for the current task:

- `references/template-catalog.md`: choose or manually recreate setup templates.
- `references/component-modules.md`: choose generated component modules and presets.
- `references/manual-storage-contract.md`: edit `.pinake` files directly when commands are unavailable.
- `references/repo-audit-checklist.md`: audit a repository before generating professional documentation.

Use `scripts/pinake-docs-helper.mjs` when the skill folder is available:

```sh
node resources/skills/pinake/scripts/pinake-docs-helper.mjs inventory --root <workspace>
node resources/skills/pinake/scripts/pinake-docs-helper.mjs recommend --root <workspace>
node resources/skills/pinake/scripts/pinake-docs-helper.mjs normalize-frontmatter --root <workspace> --write
```

## First Pass

1. Identify the workspace root.
2. Inspect repository evidence using `references/repo-audit-checklist.md` and, when available, `pinake-docs-helper.mjs inventory`.
3. Check for `.pinake/pinake.json`, `.pinake/docs`, `.pinake/.state`, `.pinake/tools`, and legacy `Pinake/`.
4. Search existing documentation before creating new content.
5. Choose the operating mode:
   - **New Pinake**: no `.pinake` exists and the user wants project documentation.
   - **Existing Pinake**: `.pinake/pinake.json` or `.pinake/docs` exists.
   - **Legacy migration**: old `Pinake/` content exists.
   - **External import**: the user provides Markdown or another docs folder to bring into Pinake.
   - **Maintenance**: docs exist and need repair, validation, search, generated modules, or polish.

## Create A New Pinake

When commands are available, run `Pinake: Create Documentation`, select the best template, choose modules, decide whether to hide `.pinake` in VS Code Explorer, handle legacy `Pinake/` migration if prompted, and confirm the final summary.

Choose the initial template with `references/template-catalog.md`. If unsure, use `pinake-docs-helper.mjs recommend` as a starting point, then adjust from repository evidence.

When commands are unavailable:

1. Read `references/manual-storage-contract.md`.
2. Create `.pinake/docs` and `.pinake/.gitignore` with `.state/`.
3. Create `.pinake/pinake.json` with version `1`, storage root `.pinake/docs`, project metadata, selected template id, enabled modules, and document records.
4. Create Markdown files under the selected template folders.
5. Add frontmatter aligned with each manifest document.
6. Defer `.pinake/.state` generation unless the task specifically requires state files; run repair or generated tooling later.

## Generate Modules And Extra Structure

Use `Pinake: Generate Module` when a shipped module matches the project. Read `references/component-modules.md` for current modules, dependencies, folders, and presets.

Common additions that improve professional documentation:

- `02_development/devtools.md` for local tools and debugging.
- `02_development/monorepo.md` for package/workspace repos.
- `04_architecture/integration-map.md` for external systems and data flows.
- `04_architecture/security.md` or the Security module for threat model and data handling.
- `05_quality/testing-strategy.md` for test layers, fixtures, and CI expectations.
- `06_operations/troubleshooting.md` for common failures and diagnostics.
- `07_project-management/documentation-maintenance.md` for ownership and review cadence.
- ADRs under `03_decisions/ADR-0001-meaningful-slug.md` for significant decisions.

## Update Existing Documentation

1. Use `Pinake: Search Documentation` or repository search to find related content before writing.
2. Open documents with `Pinake: Open Preview`; edit source with `Pinake: Edit` or direct file edits.
3. Preserve wording that records decisions or project history. Add sections, append facts, or create follow-up docs instead of rewriting broad areas.
4. Use `Pinake: New Markdown File` and `Pinake: New Folder` when commands are available. If editing manually, add the file under `.pinake/docs`, add frontmatter, and update `.pinake/pinake.json`.
5. Use `Pinake: Show Properties` to inspect document metadata and path when available.
6. Use `Pinake: Repair` after manual file creation, missing generated files, stale state, or untracked Markdown.
7. Use `Pinake: Upgrade` for legacy `Pinake/` folders or older manifest/state shapes. Preserve the original legacy folder.
8. Use rename, duplicate, delete, sort, and drag-and-drop through the TreeView when possible so manifest, index, and UI state references stay synchronized.

## Import, Export, And CI

- Use `Pinake: Import Markdown` to copy Markdown folders into `.pinake/docs/imported`; then review titles, frontmatter, manifest entries, type inference, and placement.
- Use `Pinake: Export` to create a static bundle with `docs/`, `pinake.json`, and `index.html`. Export outside `.pinake/docs`.
- Use `Pinake: Generate CI Validation Workflow` when the user wants repository validation. Confirm `.pinake/tools/validate-pinake.mjs` and `.github/workflows/pinake-validate.yml` exist.
- Install the packaged skill with `Pinake: Install Agent Skill` when the user wants Codex to reuse this automation behavior in future workspaces.

## Content Quality

- Keep documents action-oriented: purpose, when to use, commands, paths, owners, decisions, failure modes, and verification steps.
- Use tables for command catalogs, environment variables, APIs, ownership, and troubleshooting matrices.
- Use relative links between related Pinake docs when helpful.
- Keep ADRs concise and named `ADR-0001-short-slug.md`, `ADR-0002-short-slug.md`, and so on.
- Use safe placeholders such as `EXAMPLE_API_TOKEN`, `REDACTED`, or `${CLIENT_SECRET}`.
- Prefer adding a missing focused document over stuffing unrelated content into an existing page.
- Keep generated examples minimal and runnable only when verified.

## Validation

Validate after any material change:

1. Run `Pinake: Validate` when the extension is available.
2. If the generated validator exists, run one of:
   - `node .pinake/tools/validate-pinake.mjs --format text`
   - `node .pinake/tools/validate-pinake.mjs --format json`
   - `node .pinake/tools/validate-pinake.mjs --format github`
3. In the Pinake Editor repository, run `npm run pinake:validate -- --root <workspace> --format json` to validate a target workspace.
4. Address validation errors before finishing.
5. Report warning-only issues, especially Markdown style, broken links, ADR naming, frontmatter/manifest drift, and secret hygiene warnings.

## Completion Checklist

Before responding to the user:

- Confirm changed documentation lives under `.pinake/docs` unless the user asked for export, CI, or extension-maintenance work.
- Confirm `.pinake/pinake.json` references new or moved documents.
- Confirm Markdown frontmatter matches manifest metadata.
- Confirm no real secrets, credentials, personal data, or production-only values were introduced.
- Confirm validation ran, or explain exactly why it could not run.
- Summarize created, updated, skipped, and follow-up documents.
- Mention remaining placeholders or project facts that need owner confirmation.
