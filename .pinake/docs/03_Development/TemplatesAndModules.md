---
title: "Templates And Modules"
type: reference
status: draft
order: 4
---
# Templates And Modules

## Setup Templates

| Template id | Purpose | Default modules |
| --- | --- | --- |
| `minimal-internal-docs` | Lightweight starter docs for compact internal projects. | Overview, Getting Started, Development, Decisions, Reference |
| `product-project-docs` | Product and delivery docs with roadmap and changelog. | Overview, Getting Started, Development, Decisions, Project Management, Reference |
| `technical-architecture` | Architecture review, runtime boundaries, ADRs, and quality evidence. | Overview, Getting Started, Architecture, Decisions, Quality, Reference |
| `api-service-docs` | API, backend, SDK, service, or integration projects. | Overview, Getting Started, Development, Decisions, Architecture, Quality, Operations, Reference |
| `operations-runbook` | Deployment, monitoring, incident response, and operational handoff. | Overview, Getting Started, Decisions, Operations, Reference |
| `full-product-handbook` | Complete product, engineering, quality, operations, and reference handbook. | All core modules |

## Core Modules

Core module ids are `overview`, `gettingStarted`, `development`, `decisions`, `architecture`, `quality`, `operations`, `projectManagement`, and `reference`.

## Generated Component Modules

The generated module catalog currently includes API, Database, Docker, Kubernetes, CI/CD, Frontend, Mobile, Authentication, GraphQL, gRPC, WebSocket, Backend, Cache, MessageQueue, OAuth, IaC, Monitoring, Security, CLI, SDK, and Microservice.

Generated component modules may include dependencies. For example, OAuth includes Authentication, Kubernetes includes Docker, and Microservice includes API, Docker, and Monitoring.

## Presets

| Preset | Modules |
| --- | --- |
| Backend (Node.js) | API, Database, Authentication, Docker, CI/CD |
| Frontend (React) | Frontend, API, Docker, CI/CD |
| Fullstack | Frontend, API, Database, Authentication, Docker, CI/CD |
| Operations | Docker, Kubernetes, CI/CD |
| API Platform | API, GraphQL, gRPC, WebSocket, SDK |
| Platform Services | Backend, Database, Cache, MessageQueue, Authentication, OAuth |
| Cloud Native | Docker, Kubernetes, IaC, Monitoring, Security, CI/CD |
| Microservice | Microservice, API, Database, MessageQueue, Docker, Monitoring |

## Maintenance Rules

- Keep document ids unique across a template.
- Keep document paths unique and relative to `.pinake/docs`.
- Starter Markdown should include the document title and at least two actionable sections.
- Component module files should start with an H1 and live under the descriptor root folder.
- Update `docs/scaffold-reference.md`, `docs/component-catalog-roadmap.md`, and tests when module catalog behavior changes.
