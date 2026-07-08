# Security and Privacy Guidance

Pinake Editor is designed as a local-first VS Code extension. Its documentation, manifest, generated indexes, and UI state live in the current workspace so teams can inspect, review, and version the files they choose to keep.

## Local-First Behavior

Pinake Editor stores project documentation under `.pinake/` in the workspace:

- `.pinake/pinake.json` is the project manifest.
- `.pinake/docs/` contains generated and edited Markdown documentation.
- `.pinake/.state/` contains generated local state such as indexes, UI state, migration records, and module state.
- `.pinake/.gitignore` ignores generated `.state` files by default.

The extension does not use telemetry APIs and does not make network calls for normal extension behavior. Commands operate through VS Code workspace APIs and local filesystem reads and writes. Generated GitHub Actions files, if created by the user, only run when committed to a repository and executed by GitHub Actions outside the extension.

## Workspace Filesystem Access

Pinake Editor writes to predictable workspace locations:

- `.pinake/` when creating, repairing, upgrading, indexing, or generating documentation.
- `.vscode/settings.json` only when the user confirms that `.pinake` should be hidden from the standard VS Code Explorer.
- `.github/workflows/` and `.pinake/tools/` only when generating the optional CI validation workflow.

Commands that open, reveal, copy, duplicate, rename, delete, or sort documents are scoped to Pinake workspace content. Users should still review filesystem changes before committing, especially after migration, repair, duplicate, delete, or generated workflow commands.

## Secrets and Sensitive Data

Pinake documents are plain Markdown and may be committed to source control. Treat every generated or edited document as potentially shareable with repository readers.

Do not store:

- API keys, tokens, passwords, private certificates, recovery codes, or seed values.
- Production customer data, personal data, payment data, or raw incident evidence.
- Complete environment files when they contain real secret values.
- Secret references copied from cloud consoles, CI logs, local shells, or password managers.

Prefer safe placeholders and references:

- Use names such as `EXAMPLE_API_TOKEN`, not real token shapes.
- Document where secrets are managed instead of writing the secret value.
- List required environment variables with purpose, owner, and rotation guidance.
- Redact logs, curl examples, screenshots, and command output before adding them to documentation.

`Pinakes: Validate` includes conservative, warning-only secret hygiene checks for obvious private key material, known token prefixes, AWS access key IDs, JWT-like tokens, and credential assignments with concrete values. These warnings include line numbers and do not make validation fail. They are meant to catch accidental sensitive content before commit, not to replace dedicated secret-scanning tools. Safe placeholders such as `EXAMPLE_API_TOKEN`, `REDACTED`, `${CLIENT_SECRET}`, and variable names without values are ignored.

## What To Commit

The recommended commit policy is:

- Commit `.pinake/pinake.json`.
- Commit `.pinake/docs/**` after reviewing generated content for accuracy and sensitive data.
- Commit `.pinake/.gitignore`.
- Commit `.pinake/tools/validate-pinake.mjs` and `.github/workflows/...` only when the team wants repository CI validation.
- Do not commit `.pinake/.state/**`; it is generated local state.

For `.vscode/settings.json`, decide as a team. Pinake Editor only writes the Explorer hide setting after explicit confirmation, but committing that file affects all contributors who use the workspace settings.

## Auditability

Pinake files are text-based and reviewable:

- Manifests and state are JSON.
- Project documentation is Markdown.
- Generated validator scripts and workflows are plain text.
- Validation reports can be generated locally with `npm run pinake:validate`.

Before release or large documentation changes, review generated files in source control, run validation, and check that no secrets or private data were introduced.
