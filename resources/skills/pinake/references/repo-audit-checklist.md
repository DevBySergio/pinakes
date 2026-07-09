# Repository Audit Checklist

Use this reference before generating or polishing Pinake documentation. The objective is source-backed documentation, not plausible filler.

## Evidence To Inspect

- Root files: `README*`, `CHANGELOG*`, `CONTRIBUTING*`, `SECURITY*`, license, package manifests, lockfiles.
- Build and runtime configs: `package.json`, `tsconfig.json`, Docker files, compose files, IaC, Kubernetes, CI workflows.
- Source entry points: app/server/extension activation files, command registration, routers, workers, CLIs, public APIs.
- Tests: unit, integration, e2e, fixtures, test scripts, CI required checks.
- Existing docs: `docs/`, `.github/`, architecture notes, ADRs, runbooks, release docs.
- Configuration: environment variable examples, schema files, sample config, feature flags.

## Content Rules

- State only facts found in the repository or confirmed by the user.
- Mark unknown owners, environments, deployment targets, and external systems as `Needs owner confirmation`.
- Verify commands before calling them runnable. If not run, say they are inferred from scripts/configuration.
- Document where secrets are managed; never include real secret values or raw environment files.
- Prefer focused files over large catch-all pages.
- Link related Pinake documents with relative links and validate links afterward.

## Professional Coverage Targets

For most projects, aim to cover:

- Purpose, audience, current status.
- Install, local setup, configuration, common commands.
- Architecture context, runtime units, important boundaries.
- Development workflow, testing expectations, review checks.
- Operational entry points, troubleshooting, deployment or release process when present.
- ADRs for decisions visible from repository structure or explicit user direction.

## Useful Helper Commands

From a local copy of this skill:

```sh
node resources/skills/pinake/scripts/pinake-docs-helper.mjs inventory --root <workspace>
node resources/skills/pinake/scripts/pinake-docs-helper.mjs recommend --root <workspace>
node resources/skills/pinake/scripts/pinake-docs-helper.mjs normalize-frontmatter --root <workspace> --write
```
