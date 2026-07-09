# Component Catalog Roadmap

This roadmap breaks down Pinake component catalog work into small, testable slices. The shipped catalog in `src/modules/moduleDescriptors.ts` now includes the original v0.1 modules plus the first expansion slice listed below. The deferred backlog records useful future modules that are intentionally not part of the current completion claim.

## Goal

The component catalog should let users add focused documentation modules for the parts of a system they actually operate. Each module should provide a predictable folder, a concise set of starter documents, dependencies where useful, and tests that prove generated files are not overwritten.

## Current Shipped Slice

These modules have descriptors, starter files, manifest/state integration through `ScaffoldService`, command-palette generation, and representative tests.

| Module id | Folder | Coverage |
| --- | --- | --- |
| `API` | `03_Development/API` | REST API contracts, authentication, endpoints, errors, versioning, rate limits, SDKs, examples, OpenAPI stub |
| `Database` | `03_Development/Database` | schema, entities, relationships, indexes, migrations, performance, backup |
| `Docker` | `05_Operations/Docker` | images, containers, volumes, networks, compose |
| `Kubernetes` | `05_Operations/Kubernetes` | clusters, manifests, services, ingress, deployments, config maps, secrets |
| `CI/CD` | `05_Operations/CI-CD` | pipelines, workflows, environments, release gates |
| `Frontend` | `03_Development/Frontend` | components, routing, state, styling, accessibility |
| `Mobile` | `03_Development/Mobile` | screens, plugins, state, store release |
| `Authentication` | `03_Development/Authentication` | users, permissions, sessions, OAuth |
| `GraphQL` | `03_Development/GraphQL` | schema, resolvers, operations, clients, errors |
| `gRPC` | `03_Development/gRPC` | protobuf contracts, services, streaming, errors, compatibility |
| `WebSocket` | `03_Development/WebSocket` | protocol, events, channels, reliability |
| `Backend` | `03_Development/Backend` | architecture, domain model, jobs, configuration, dependencies |
| `Cache` | `03_Development/Cache` | keys, invalidation, performance, operations |
| `MessageQueue` | `03_Development/MessageQueue` | topics, producers/consumers, delivery semantics, failure handling |
| `OAuth` | `03_Development/OAuth` | flows, clients, scopes, token lifecycle |
| `IaC` | `05_Operations/IaC` | providers, modules, state, environments, change management |
| `Monitoring` | `05_Operations/Monitoring` | metrics, dashboards, alerts, SLOs, incident review |
| `Security` | `04_Architecture/Security` | threat model, secrets, data classification, access control, security review |
| `CLI` | `03_Development/CLI` | commands, configuration, exit codes, distribution, examples |
| `SDK` | `03_Development/SDK` | installation, API surface, versioning, examples, release |
| `Microservice` | `04_Architecture/Microservice` | boundaries, communication, data ownership, deployment, operations |

## Module Definition Checklist

Each catalog module should include:

- A stable module id and user-facing title.
- A short description suitable for QuickPick.
- A root folder that fits the Pinake documentation structure.
- Starter Markdown files with useful headings and no project-specific claims.
- Dependencies on related modules when generation order matters.
- Manifest and state updates through the existing scaffold services.
- Tests for generation, idempotency, dependency selection, and edited-file preservation.
- Tree icon mapping or a documented fallback when the module introduces a new folder type.

## Suggested Delivery Slices

| Slice | Modules | Outcome |
| --- | --- | --- |
| Service interfaces | Backend, API, GraphQL, gRPC, WebSocket, Microservice | Document how services expose capabilities, communicate, version contracts, and handle compatibility. |
| Data and async systems | Database, Cache, MessageQueue, Search, DataPipeline, ML, GraphDB | Document data ownership, storage, movement, consistency, performance, and operational risk. |
| Identity and business workflows | Authentication, Authorization, OAuth, Payments, Email, Security | Document trust boundaries, permissions, customer-facing workflows, compliance-sensitive flows, and abuse controls. |
| Platform and operations | Docker, Kubernetes, IaC, CI/CD, Monitoring, Logging, DevTools | Document deployment, infrastructure, observability, release gates, and operator workflows. |
| Developer-facing packages | CLI, Library/SDK, Plugin/Extension | Document install paths, public interfaces, versioning, examples, compatibility, and release processes. |
| Repository and migration patterns | Monorepo, LegacyMigration, Documentation, Testing | Document repository structure, migration plans, documentation ownership, testing strategy, and quality gates. |

## Deferred Backlog

These modules are intentionally deferred. They should not be treated as shipped until a future task adds descriptors, starter files, presets where useful, icon coverage or documented fallback behavior, and generation tests.

| Module | Suggested folder | Starter documents |
| --- | --- | --- |
| Authorization | `03_Development/Authorization` | Overview, Roles, Policies, Permissions, Enforcement, Auditing |
| Payments | `03_Development/Payments` | Overview, Providers, Checkout, Webhooks, Refunds, Reconciliation |
| Search | `03_Development/Search` | Overview, Indexes, QuerySyntax, Ranking, Reindexing, Operations |
| Email | `03_Development/Email` | Overview, Providers, Templates, Deliverability, Bounces, Compliance |
| DataPipeline | `03_Development/DataPipeline` | Overview, Sources, Transforms, Sinks, Scheduling, DataQuality |
| ML | `03_Development/ML` | Overview, Models, Training, Evaluation, Serving, Monitoring |
| GraphDB | `03_Development/GraphDB` | Overview, Model, Queries, Traversals, Indexes, Operations |
| Logging | `05_Operations/Logging` | Overview, Sources, Format, Retention, Redaction, Queries |
| Plugin/Extension | `03_Development/PluginExtension` | Overview, HostIntegration, Commands, Permissions, Packaging, Compatibility |
| Monorepo | `02_Development/Monorepo` | Overview, Packages, DependencyGraph, Build, Testing, Release |
| LegacyMigration | `07_ProjectManagement/LegacyMigration` | Overview, CurrentState, TargetState, MigrationPlan, Rollback, Validation |
| Documentation | `07_ProjectManagement/Documentation` | Overview, Ownership, Taxonomy, ReviewProcess, StyleGuide, Maintenance |
| Testing | `05_Quality/Testing` | Overview, Strategy, TestTypes, Fixtures, CI, Gaps |
| DevTools | `02_Development/DevTools` | Overview, LocalTools, Scripts, Debugging, Automation, Troubleshooting |

## Acceptance Criteria

The current shipped slice is complete when:

- Every module in Current Shipped Slice has a descriptor and starter files.
- Presets expose coherent combinations without forcing unrelated modules.
- Existing generated modules still pass idempotency and no-overwrite tests.
- Public docs explain the difference between setup templates, shipped generated component modules, and deferred component modules until those flows are unified.
- Validation and search continue to work on generated module documents.

The full catalog backlog is complete only when every Deferred Backlog module has a descriptor, starter files, preset treatment where useful, icon mapping or documented fallback behavior, and tests.
