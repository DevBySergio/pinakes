# Pinake Release Checklist

Use this checklist before publishing a VSIX or marketplace build.

## Marketplace Metadata

- Confirm `package.json` has the final Marketplace `publisher` ID, repository URL, issue URL, homepage, license, keywords, `galleryBanner`, and PNG `icon`.
- Confirm the root `LICENSE` file matches the owner-approved license.
- Confirm README and CHANGELOG images are Marketplace-safe: use HTTPS URLs or packaged non-SVG images.
- Move completed release notes out of `[Unreleased]` into the target version heading before packaging.

## Automated Checks

- Run `npm run compile`.
- Run `npm run lint`.
- Run `npm test`.
- Run `npm pack --dry-run` and review the npm file list.
- Run `npm exec --yes --package @vscode/vsce vsce package`.
- Inspect the generated VSIX manifest and confirm the publisher is not `undefined`.
- Confirm the generated VSIX manifest uses `devbysergioPinakesExplorer` and `devbysergioPinakesView`, with no `pinakesExplorer` or `pinakesView` references.
- Confirm the packaged build includes `out/**`, `resources/pinake-icon.svg`, `resources/pinake-marketplace-icon.png`, `resources/skills/pinake/SKILL.md`, `scripts/validate-pinake.mjs`, `schemas/*.schema.json`, `docs/`, `examples/sample-pinake-workspace`, `README.md`, `CHANGELOG.md`, and `LICENSE`.
- Confirm the packaged build does not include `.github/**`, stale `*.vsix` or `*.tgz` files, `node_modules/**`, `.vscode-test/**`, or `examples/sample-pinake-workspace/.pinake/.state/**`.

## Manual VS Code Smoke Test

- Install the packaged VSIX into a clean VS Code profile.
- In a profile that previously had a local `undefined_publisher.pinakes` VSIX, confirm the new Pinake TreeView does not duplicate toolbar icons or overflow menu entries.
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
- Keep VSIX packaging on one strategy. This repo uses `.vscodeignore` and `.npmignore`; do not add a `package.json` `files` allowlist unless the ignore-file strategy is removed.
- Do not publish real credentials, tokens, private keys, or production-only sensitive values in sample Pinake documents.

## Publish Notes

- Create or confirm the Visual Studio Marketplace publisher before publishing, then keep the exact publisher ID in `package.json`.
- For a first release, package locally with `vsce package` and either upload the VSIX in the Marketplace publisher portal or run `vsce publish --packagePath pinakes-1.0.0.vsix`.
- Prefer Microsoft Entra ID based automated publishing for long-term automation. Do not depend on long-lived global Azure DevOps PATs.
- After the Marketplace release is live, create and push the `v1.0.0` git tag and attach the final VSIX to a GitHub release if release artifacts are mirrored there.
