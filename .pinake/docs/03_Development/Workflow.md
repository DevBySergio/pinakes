---
title: "Workflow"
type: process
status: draft
order: 1
---
# Workflow

## Change Lifecycle

| Stage | Required actions | Evidence |
| --- | --- | --- |
| Plan | Identify user flow, storage impact, command surface, schemas, and tests. | Issue, notes, or PR description. |
| Implement | Keep command UI thin and put reusable behavior in services. | Focused source changes. |
| Verify | Run compile, lint, tests, and Pinake validation when docs or storage change. | Command output in PR. |
| Document | Update README, `docs/`, templates, schemas, or Pinake docs as appropriate. | Documentation diff. |
| Release | Follow release checklist and update changelog. | Completed release checklist. |

## Local Commands

| Task | Command |
| --- | --- |
| Install dependencies | `npm ci` |
| Compile | `npm run compile` |
| Watch TypeScript | `npm run watch` |
| Lint | `npm run lint` |
| Test | `npm test` |
| Validate a Pinake workspace | `npm run pinake:validate -- --root /path/to/workspace --format text` |
| Prepublish | `npm run vscode:prepublish` |

## Branch And Review Expectations

No repository-specific branch policy is present in source. Use a short feature or fix branch name, keep changes scoped, and include verification evidence. Reviewers should check command behavior, storage compatibility, tests, docs, schema impact, and security/privacy implications.

## Documentation Impact Check

Update documentation when changes affect:

- command titles, IDs, menus, keybindings, or TreeView behavior;
- `.pinake` storage, manifest, state, schemas, or validation rules;
- setup templates, generated component modules, imports, exports, or repair/upgrade behavior;
- CI, release, packaging, or agent skill installation.

## Definition Of Done

- `npm run compile` passes.
- `npm run lint` passes.
- Relevant tests pass or a clear reason is documented.
- Pinake validation passes for affected documentation workspaces.
- No real secrets, private data, or raw incident evidence were introduced.
- User-facing docs and changelog entries are updated when behavior changed.
