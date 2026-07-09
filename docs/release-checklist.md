# Pinake Release Checklist

Use this checklist before publishing a VSIX or marketplace build.

## Automated Checks

- Run `npm run compile`.
- Run `npm run lint`.
- Run `npm test`.
- Run `npm pack --dry-run` or VSIX packaging and review the file list.
- Confirm the packaged build includes `resources/skills/pinake/SKILL.md`, `scripts/validate-pinake.mjs`, `schemas/*.schema.json`, `docs/`, and `examples/sample-pinake-workspace`.

## Manual VS Code Smoke Test

- Install the packaged VSIX into a clean VS Code profile.
- Capture or refresh the README/marketplace screenshot or GIF from the installed VSIX if the UI changed.
- Open a blank workspace and confirm the Pinake Activity Bar container and empty state render.
- Run `Pinake: Create Documentation`, create a Minimal Internal Docs workspace, and validate it.
- Check Light, Dark, and High Contrast themes for readable TreeView labels, descriptions, tooltips, diagnostics, and output reports.
- Exercise TreeView preview, edit, favorite/unfavorite, rename, duplicate, delete, reveal, copy path, properties, sort, and drag-and-drop move.
- Export to a normal external folder and confirm `docs/`, `pinake.json`, and `index.html` are written.
- Confirm exporting into `.pinake/docs` is rejected with a clear error.
- Import a folder with nested Markdown files and confirm the manifest, TreeView, and search index update.
- Run `Pinake: Generate CI Validation Workflow` and validate the generated workflow/validator files.
- Run `Pinake: Install Agent Skill` in a temporary `CODEX_HOME` and confirm overwrite prompts are safe.

## Packaging Notes

- The sample workspace contains `.pinake/.gitignore` so generated `.state/` files stay ignored when copied from source or packaged as a VSIX.
- `npm pack --dry-run` may omit `.gitignore` files because npm treats them as package metadata. Use VSIX packaging when verifying extension-distribution contents.
- Do not publish real credentials, tokens, private keys, or production-only sensitive values in sample Pinake documents.
