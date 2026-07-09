# Pinake Scaffold Reference

This reference documents the generated structures created by `Pinake: Create Documentation`, `Pinake: Generate Module`, `Pinake: Repair`, and `Pinake: Upgrade`.

## Setup Templates

Setup templates create folders and starter Markdown under `.pinake/docs`, write `.pinake/pinake.json`, initialize `.pinake/.state`, and optionally update `.vscode/settings.json` to hide `.pinake` from the standard Explorer.
Default modules are preselected in the setup flow. Recommended modules are highlighted as useful optional coverage, but users choose whether to include them.

| Template id | Title | Default modules | Recommended optional modules |
| --- | --- | --- | --- |
| `minimal-internal-docs` | Minimal Internal Docs | Overview, Getting Started, Development, Decisions / ADR, Reference / Appendix | Quality, Project Management |
| `product-project-docs` | Product / Project Docs | Overview, Getting Started, Development, Decisions / ADR, Project Management, Reference / Appendix | Architecture, Quality |
| `technical-architecture` | Technical Architecture | Overview, Getting Started, Architecture, Decisions / ADR, Quality, Reference / Appendix | Development, Operations |
| `api-service-docs` | API / Service Docs | Overview, Getting Started, Development, Decisions / ADR, Architecture, Quality, Operations, Reference / Appendix | Project Management |
| `operations-runbook` | Operations / Runbook | Overview, Getting Started, Decisions / ADR, Operations, Reference / Appendix | Architecture, Quality |
| `full-product-handbook` | Full Product Handbook | All core modules with legacy-style capitalized folder names | None |

## Core Modules

| Module id | Title | Default folder | Starter documents |
| --- | --- | --- | --- |
| `overview` | Overview | `00_overview` | Overview, Product Context |
| `gettingStarted` | Getting Started | `01_getting-started` | Installation, Local Setup, Configuration |
| `development` | Development | `02_development` | Workflow, Testing, Contributing, Coding Standards |
| `decisions` | Decisions / ADR | `03_decisions` | ADR-0001 example |
| `architecture` | Architecture | `04_architecture` | System Context, Containers, Architecture Overview |
| `quality` | Quality | `05_quality` | Testing Strategy, Code Review, Metrics |
| `operations` | Operations | `06_operations` | Deployment, Monitoring, Logging, Backups, Incident Response |
| `projectManagement` | Project Management | `07_project-management` | Roadmap, Changelog |
| `reference` | Reference / Appendix | `99_appendix` | Glossary, References |

The `full-product-handbook` template overrides folders and several starter documents to preserve the older large handbook shape, such as `00_Overview`, `03_Development`, and `06_Decisions`.
It now generates starter Development documents under `03_Development` instead of leaving that section folder-only.

## Component Module Matrix

Component modules are generated after setup through `Pinake: Generate Module`. They add focused starter documentation and update manifest/module state.
This table is the shipped component catalog slice. The broader catalog roadmap keeps additional modules in a deferred backlog until their descriptors, starter files, presets, icon treatment, and tests are added.

| Module | Folder | Dependencies | Main coverage |
| --- | --- | --- | --- |
| API | `03_Development/API` | None | REST API overview, auth, endpoints, errors, versioning, rate limits, SDKs, examples, OpenAPI stub |
| Database | `03_Development/Database` | None | schema, entities, relationships, indexes, migrations, performance, backup |
| Docker | `05_Operations/Docker` | None | images, containers, volumes, networks, compose |
| Kubernetes | `05_Operations/Kubernetes` | Docker | architecture, manifests, services, ingress, deployments, config maps, secrets |
| CI/CD | `05_Operations/CI-CD` | None | pipelines, workflows, environments, release gates |
| Frontend | `03_Development/Frontend` | None | components, routing, state, styling, accessibility |
| Mobile | `03_Development/Mobile` | None | screens, plugins, state, store release |
| Authentication | `03_Development/Authentication` | None | users, permissions, sessions, OAuth |
| GraphQL | `03_Development/GraphQL` | API | schema, resolvers, operations, clients, errors |
| gRPC | `03_Development/gRPC` | API | protobuf contracts, services, streaming, errors, compatibility |
| WebSocket | `03_Development/WebSocket` | API | protocol, events, channels, reliability |
| Backend | `03_Development/Backend` | None | architecture, domain model, jobs, configuration, dependencies |
| Cache | `03_Development/Cache` | None | keys, invalidation, performance, operations |
| Message Queue | `03_Development/MessageQueue` | None | topics, producers/consumers, delivery semantics, failure handling |
| OAuth | `03_Development/OAuth` | Authentication | flows, clients, scopes, token lifecycle |
| Infrastructure as Code | `05_Operations/IaC` | None | providers, modules, state, environments, change management |
| Monitoring | `05_Operations/Monitoring` | None | dashboards, alerts, SLOs, runbooks, ownership |
| Security | `04_Architecture/Security` | None | threat model, secrets, data classification, access control, review checklist |
| CLI | `03_Development/CLI` | None | commands, config, exit codes, distribution, examples |
| SDK | `03_Development/SDK` | API | installation, API surface, versioning, examples, release |
| Microservice | `04_Architecture/Microservice` | API, Docker, Monitoring | ownership, APIs, data, deployment, operations |

## Deferred Component Modules

These modules are tracked as future catalog work and are not generated by the current extension build.

| Module | Suggested folder | Main coverage |
| --- | --- | --- |
| Authorization | `03_Development/Authorization` | roles, policies, permissions, enforcement, auditing |
| Payments | `03_Development/Payments` | providers, checkout, webhooks, refunds, reconciliation |
| Search | `03_Development/Search` | indexes, query syntax, ranking, reindexing, operations |
| Email | `03_Development/Email` | providers, templates, deliverability, bounces, compliance |
| DataPipeline | `03_Development/DataPipeline` | sources, transforms, sinks, scheduling, data quality |
| ML | `03_Development/ML` | models, training, evaluation, serving, monitoring |
| GraphDB | `03_Development/GraphDB` | model, queries, traversals, indexes, operations |
| Logging | `05_Operations/Logging` | sources, format, retention, redaction, queries |
| Plugin/Extension | `03_Development/PluginExtension` | host integration, commands, permissions, packaging, compatibility |
| Monorepo | `02_Development/Monorepo` | packages, dependency graph, build, testing, release |
| LegacyMigration | `07_ProjectManagement/LegacyMigration` | current state, target state, migration plan, rollback, validation |
| Documentation | `07_ProjectManagement/Documentation` | ownership, taxonomy, review process, style guide, maintenance |
| Testing | `05_Quality/Testing` | strategy, test types, fixtures, CI, gaps |
| DevTools | `02_Development/DevTools` | local tools, scripts, debugging, automation, troubleshooting |

## Presets

| Preset | Modules |
| --- | --- |
| Backend (Node.js) | API, Database, Docker, CI/CD, Authentication |
| Frontend (React) | Frontend, API, Docker, CI/CD |
| Fullstack | Frontend, API, Database, Docker, CI/CD, Authentication |
| Operations | Docker, Kubernetes, CI/CD |
| API Platform | API, GraphQL, gRPC, WebSocket, SDK |
| Platform Services | Backend, Database, Cache, MessageQueue, Authentication, OAuth |
| Cloud Native | Docker, Kubernetes, IaC, Monitoring, Security |
| Microservice | Microservice, API, Database, MessageQueue, Docker, Monitoring |

Dependencies are included automatically when a selected module declares them.

## Repair And Upgrade

`Pinake: Repair`:

- creates missing folders and generated starter documents;
- keeps edited Markdown unchanged;
- adds untracked Markdown under `.pinake/docs` to the manifest;
- ensures `.pinake/.state` files exist;
- rebuilds the local search index.

`Pinake: Upgrade`:

- creates `.pinake/docs` when needed;
- copies an existing `Pinake/` folder into `.pinake/docs`;
- builds a current manifest from existing or legacy metadata;
- records migration history;
- syncs modules and version state;
- preserves the original `Pinake/` folder.

## Sample Workspace

See `examples/sample-pinake-workspace` for a minimal Pinake workspace with a manifest, starter docs, and `.pinake/.gitignore`.
