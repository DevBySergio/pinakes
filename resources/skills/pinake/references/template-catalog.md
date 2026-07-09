# Pinake Template Catalog

Use this reference when choosing or manually recreating the initial Pinake setup template.

## Setup Templates

| Template id | Title | Default core modules | Recommended optional modules | Use when |
| --- | --- | --- | --- | --- |
| `minimal-internal-docs` | Minimal Internal Docs | Overview, Getting Started, Development, Decisions / ADR, Reference / Appendix | Quality, Project Management | Unknown, compact, library, script, personal, or small internal project. |
| `product-project-docs` | Product / Project Docs | Overview, Getting Started, Development, Decisions / ADR, Project Management, Reference / Appendix | Architecture, Quality | Product delivery, stakeholder coordination, roadmap, changelog, or broad project tracking matters. |
| `technical-architecture` | Technical Architecture | Overview, Getting Started, Architecture, Decisions / ADR, Quality, Reference / Appendix | Development, Operations | Architecture review, platform, complex system, significant integration, or design-heavy repository. |
| `api-service-docs` | API / Service Docs | Overview, Getting Started, Development, Decisions / ADR, Architecture, Quality, Operations, Reference / Appendix | Project Management | Backend service, API, SDK, integration, service repository, or internal platform component. |
| `operations-runbook` | Operations / Runbook | Overview, Getting Started, Decisions / ADR, Operations, Reference / Appendix | Architecture, Quality | Deployment, handoff, incident response, monitoring, backup, SRE, or production support focus. |
| `full-product-handbook` | Full Product Handbook | All core modules | None | User asks for a complete handbook or a broad organization-wide documentation structure. |

## Core Module Folders

Most templates use these folders:

| Core module | Folder | Starter coverage |
| --- | --- | --- |
| Overview | `00_overview` | Purpose, problem, audience, status, product context. |
| Getting Started | `01_getting-started` | Installation, local setup, configuration. |
| Development | `02_development` | Workflow, testing, contributing, coding standards. |
| Decisions / ADR | `03_decisions` | ADR starter document. |
| Architecture | `04_architecture` | Context, containers, architecture overview. |
| Quality | `05_quality` | Testing strategy, code review, metrics. |
| Operations | `06_operations` | Deployment, monitoring, logging, backups, incident response. |
| Project Management | `07_project-management` | Roadmap, changelog. |
| Reference / Appendix | `99_appendix` | Glossary, references. |

Recommended optional modules are useful additions, not part of the default selection.
The `full-product-handbook` template intentionally uses legacy-style capitalized folders such as `00_Overview`, `03_Development`, `05_Operations`, and `99_Appendix`.
It includes starter Development documents under `03_Development`.

## Manual Creation Rules

- Use `.pinake/docs` as the Markdown root and `.pinake/pinake.json` as the manifest.
- Add manifest entries only for documents under `.pinake/docs`.
- Add frontmatter to every Markdown document with `title`, `type`, `status`, and `order`.
- Keep generated `.pinake/.state` files extension-owned; use repair or generated tooling to recreate them.
- For generated component modules, follow `references/component-modules.md`; component modules use capitalized folders such as `03_Development/API`.
