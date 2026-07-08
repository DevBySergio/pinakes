# Component Catalog Roadmap

This roadmap breaks down the remaining Pinake component catalog work into small, testable slices. It complements the existing v0.1 generated modules in `src/modules/moduleDescriptors.ts`: API, Database, Docker, Kubernetes, CI/CD, Frontend, Mobile, and Authentication.

## Goal

The component catalog should let users add focused documentation modules for the parts of a system they actually operate. Each module should provide a predictable folder, a concise set of starter documents, dependencies where useful, and tests that prove generated files are not overwritten.

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

## Backlog

| Module | Suggested folder | Starter documents |
| --- | --- | --- |
| Backend | `03_Development/Backend` | Overview, Runtime, Configuration, RequestLifecycle, Dependencies, Errors |
| GraphQL | `03_Development/GraphQL` | Overview, Schema, Queries, Mutations, Subscriptions, Errors |
| gRPC | `03_Development/gRPC` | Overview, Services, Protobuf, Streaming, Errors, Compatibility |
| WebSocket | `03_Development/WebSocket` | Overview, Protocol, Events, Connections, Scaling, Troubleshooting |
| Cache | `03_Development/Cache` | Overview, Keys, Expiration, Invalidation, Consistency, Operations |
| MessageQueue | `03_Development/MessageQueue` | Overview, Topics, Producers, Consumers, RetryPolicy, DeadLetters |
| Authorization | `03_Development/Authorization` | Overview, Roles, Policies, Permissions, Enforcement, Auditing |
| OAuth | `03_Development/OAuth` | Overview, Providers, Flows, Scopes, Callbacks, TokenLifecycle |
| Payments | `03_Development/Payments` | Overview, Providers, Checkout, Webhooks, Refunds, Reconciliation |
| Search | `03_Development/Search` | Overview, Indexes, QuerySyntax, Ranking, Reindexing, Operations |
| Email | `03_Development/Email` | Overview, Providers, Templates, Deliverability, Bounces, Compliance |
| DataPipeline | `03_Development/DataPipeline` | Overview, Sources, Transforms, Sinks, Scheduling, DataQuality |
| ML | `03_Development/ML` | Overview, Models, Training, Evaluation, Serving, Monitoring |
| GraphDB | `03_Development/GraphDB` | Overview, Model, Queries, Traversals, Indexes, Operations |
| IaC | `05_Operations/IaC` | Overview, Tooling, Modules, Environments, State, ChangeReview |
| Monitoring | `05_Operations/Monitoring` | Overview, Dashboards, Alerts, SLOs, Runbooks, Ownership |
| Logging | `05_Operations/Logging` | Overview, Sources, Format, Retention, Redaction, Queries |
| Security | `05_Operations/Security` | Overview, ThreatModel, Secrets, VulnerabilityManagement, Incidents, ReviewChecklist |
| CLI | `03_Development/CLI` | Overview, Commands, Configuration, ExitCodes, Distribution, Examples |
| Library/SDK | `03_Development/SDK` | Overview, Installation, API, Versioning, Examples, Release |
| Plugin/Extension | `03_Development/PluginExtension` | Overview, HostIntegration, Commands, Permissions, Packaging, Compatibility |
| Monorepo | `02_Development/Monorepo` | Overview, Packages, DependencyGraph, Build, Testing, Release |
| Microservice | `03_Development/Microservice` | Overview, Ownership, APIs, Data, Deployment, Operations |
| LegacyMigration | `07_ProjectManagement/LegacyMigration` | Overview, CurrentState, TargetState, MigrationPlan, Rollback, Validation |
| Documentation | `07_ProjectManagement/Documentation` | Overview, Ownership, Taxonomy, ReviewProcess, StyleGuide, Maintenance |
| Testing | `05_Quality/Testing` | Overview, Strategy, TestTypes, Fixtures, CI, Gaps |
| DevTools | `02_Development/DevTools` | Overview, LocalTools, Scripts, Debugging, Automation, Troubleshooting |

## Acceptance Criteria

The component catalog expansion is complete when:

- Every backlog module has a descriptor and starter files.
- Presets expose coherent combinations without forcing unrelated modules.
- Existing generated modules still pass idempotency and no-overwrite tests.
- README or public docs explain the difference between setup templates and generated component modules until those flows are unified.
- Validation and search continue to work on generated module documents.

