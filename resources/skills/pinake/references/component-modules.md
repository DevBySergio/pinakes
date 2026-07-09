# Pinake Component Modules

Use this reference when choosing `Pinake: Generate Module` options or manually creating equivalent focused documentation.

## Shipped Modules

| Module | Folder | Dependencies | Coverage |
| --- | --- | --- | --- |
| `API` | `03_Development/API` | None | REST API overview, authentication, endpoints, errors, versioning, rate limits, SDKs, examples, OpenAPI stub. |
| `Database` | `03_Development/Database` | None | Schema, entities, relationships, indexes, migrations, performance, backup. |
| `Docker` | `05_Operations/Docker` | None | Images, containers, volumes, networks, compose. |
| `Kubernetes` | `05_Operations/Kubernetes` | `Docker` | Architecture, manifests, services, ingress, deployments, config maps, secrets. |
| `CI/CD` | `05_Operations/CI-CD` | None | Pipelines, workflows, environments, release gates. |
| `Frontend` | `03_Development/Frontend` | None | Components, routing, state, styling, accessibility. |
| `Mobile` | `03_Development/Mobile` | None | Screens, plugins, state, store release. |
| `Authentication` | `03_Development/Authentication` | None | Users, permissions, sessions, OAuth. |
| `GraphQL` | `03_Development/GraphQL` | `API` | Schema, resolvers, operations, clients, errors. |
| `gRPC` | `03_Development/gRPC` | `API` | Protobuf contracts, services, streaming, errors, compatibility. |
| `WebSocket` | `03_Development/WebSocket` | `API` | Protocol, events, channels, reliability. |
| `Backend` | `03_Development/Backend` | None | Architecture, domain model, jobs, configuration, dependencies. |
| `Cache` | `03_Development/Cache` | None | Keys, invalidation, performance, operations. |
| `MessageQueue` | `03_Development/MessageQueue` | None | Topics and queues, producers/consumers, delivery semantics, failure handling. |
| `OAuth` | `03_Development/OAuth` | `Authentication` | Flows, clients, scopes, token lifecycle. |
| `IaC` | `05_Operations/IaC` | None | Providers, modules, state, environments, change management. |
| `Monitoring` | `05_Operations/Monitoring` | None | Metrics, dashboards, alerts, SLOs, incident review. |
| `Security` | `04_Architecture/Security` | None | Threat model, secrets, data classification, access control, review checklist. |
| `CLI` | `03_Development/CLI` | None | Commands, configuration, distribution, troubleshooting. |
| `SDK` | `03_Development/SDK` | `API` | Installation, API reference, examples, versioning. |
| `Microservice` | `04_Architecture/Microservice` | `API`, `Docker`, `Monitoring` | Boundaries, communication, data ownership, deployment, operations. |

Dependencies are included automatically by the extension. When creating files manually, add dependency modules too.

## Presets

| Preset | Modules |
| --- | --- |
| Backend (Node.js) | `API`, `Database`, `Authentication`, `Docker`, `CI/CD` |
| Frontend (React) | `Frontend`, `API`, `Docker`, `CI/CD` |
| Fullstack | `Frontend`, `API`, `Database`, `Authentication`, `Docker`, `CI/CD` |
| Operations | `Docker`, `Kubernetes`, `CI/CD` |
| API Platform | `API`, `GraphQL`, `gRPC`, `WebSocket`, `SDK` |
| Platform Services | `Backend`, `Database`, `Cache`, `MessageQueue`, `Authentication`, `OAuth` |
| Cloud Native | `Docker`, `Kubernetes`, `IaC`, `Monitoring`, `Security`, `CI/CD` |
| Microservice | `Microservice`, `API`, `Database`, `MessageQueue`, `Docker`, `Monitoring` |

## Manual Placement Notes

- Generated component modules use capitalized paths, even when the initial setup template used lowercase core folders.
- Do not rename generated module folders just to match the core template style; the extension and TreeView handle both naming styles.
- If a module creates non-Markdown assets such as `openapi.yaml`, keep them near the module documents but only Markdown files need manifest document records.
