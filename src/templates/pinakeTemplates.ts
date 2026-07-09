import {
	PinakeDocumentDefinition,
	PinakeDocumentStatus,
	PinakeDocumentType,
	PinakeModuleDefinition,
	PinakeModuleId,
	PinakeTemplateDefinition,
} from '../types';

export const pinakeModuleDefinitions: PinakeModuleDefinition[] = [
	{
		id: 'overview',
		title: 'Overview',
		folder: '00_overview',
		documents: [
			doc('overview-index', 'Overview', '00_overview/index.md', 'overview', 1, `## Purpose

Describe what this project does, who it serves, and why it exists.

## Product Snapshot

| Field | Notes |
| --- | --- |
| Primary users | |
| Maintainers | |
| Current lifecycle stage | Draft, active, maintenance, deprecated |
| Source of truth | Repository, product brief, ticket, or external system |

## Problem

State the user, business, or operational problem this project solves.

## Audience

List the people who read or maintain these docs, such as developers, operators, support, product, security, or external integrators.

## Success Signals

- What outcome proves this project is useful?
- What operational signal shows the system is healthy?
- What user behavior or feedback should improve?

## Current Status

- Status:
- Owner:
- Last reviewed:
- Next review:

## Open Questions

- What is still unknown?
- Which assumptions need validation?
`),
			doc('overview-product-context', 'Product Context', '00_overview/product-context.md', 'explanation', 2, `## Background

Explain the events, user needs, incidents, or strategy that led to this project.

## Goals

- Outcome:
- User benefit:
- Business or team benefit:
- Operational benefit:

## Non-Goals

List behaviors, audiences, platforms, or responsibilities this project deliberately does not cover.

## Stakeholders

| Stakeholder | Role | Needs from this project | Contact or source |
| --- | --- | --- | --- |
| | | | |

## Key User Journeys

1. Who starts the journey?
2. What do they need to accomplish?
3. What does success look like?
4. Where can the journey fail?

## Constraints

- Technical:
- Security or privacy:
- Operational:
- Product or deadline:
`),
		],
	},
	{
		id: 'gettingStarted',
		title: 'Getting Started',
		folder: '01_getting-started',
		documents: [
			doc('getting-started-installation', 'Installation', '01_getting-started/installation.md', 'tutorial', 1, `## Prerequisites

| Requirement | Version or access | How to verify |
| --- | --- | --- |
| Runtime | | |
| Package manager | | |
| External services | | |
| Permissions | | |

## Install

| Step | Command or action | Expected result |
| --- | --- | --- |
| Clone repository | | Repository is available locally |
| Install dependencies | | Dependencies install without errors |
| Prepare configuration | | Required local config exists |

## First Run

Document the shortest path to start the project locally.

1. Start required services.
2. Run the application or extension.
3. Open the main user-facing entry point.

## Smoke Check

- The project starts without errors.
- The main page, command, API, or job responds.
- Logs do not show missing configuration or failed connections.

## Common Setup Problems

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| | | |
`),
			doc('getting-started-local-setup', 'Local Setup', '01_getting-started/local-setup.md', 'how-to', 2, `## Local Environment

Describe the expected local development shape: editor, runtime, services, ports, files, and accounts.

## Required Services

| Service | Purpose | Local default | Reset or seed command |
| --- | --- | --- | --- |
| | | | |

## Common Commands

| Task | Command | Notes |
| --- | --- | --- |
| Install dependencies | | |
| Start locally | | |
| Run tests | | |
| Lint or format | | |
| Build | | |

## Local Data

- Where does test or seed data come from?
- Which files or databases are safe to delete locally?
- Which data must never be committed?

## Debugging

- How to attach a debugger:
- Where logs appear:
- Useful breakpoints or traces:

## Reset Checklist

- Stop local processes.
- Clear generated files or caches.
- Reinstall or rebuild only if needed.
- Recreate local configuration from documented examples.
`),
			doc('getting-started-configuration', 'Configuration', '01_getting-started/configuration.md', 'reference', 3, `## Configuration Sources

| Source | Environment | Owner | Notes |
| --- | --- | --- | --- |
| Environment variables | Local, CI, production | | |
| Config files | | | |
| Secret manager | | | |
| Feature flags | | | |

## Environment Variables

| Name | Required | Default | Description |
| --- | --- | --- | --- |
| | | | |

## Secrets

- Store secrets in:
- Local secret setup:
- Rotation owner:
- Values that must never be committed:

## Defaults and Overrides

Explain which settings have safe defaults and which must be explicitly set per environment.

## Validation

Document the command, startup check, or CI job that proves configuration is complete.
`),
		],
	},
	{
		id: 'development',
		title: 'Development',
		folder: '02_development',
		documents: [
			doc('development-workflow', 'Development Workflow', '02_development/workflow.md', 'process', 1, `## Change Lifecycle

1. Clarify the issue, user story, or maintenance goal.
2. Identify impacted modules, docs, tests, and operational behavior.
3. Implement behind the smallest safe change set.
4. Verify locally and in CI.
5. Document release or handoff notes.

## Branching

| Change type | Branch naming | Review expectation |
| --- | --- | --- |
| Feature | | |
| Bug fix | | |
| Maintenance | | |

## Review

Reviewers should check correctness, maintainability, tests, security or privacy impact, and documentation impact.

## Release Handoff

- What changed?
- How was it verified?
- What should operators or support know?
- Is rollback possible?

## Definition of Done

- Tests and lint pass.
- Relevant docs are updated.
- Risk and rollout notes are captured.
- Follow-up tasks are linked or created.
`),
			doc('development-testing', 'Testing', '02_development/testing.md', 'testing', 2, `## Test Commands

| Scope | Command | When to run |
| --- | --- | --- |
| Unit | | Before opening a change |
| Integration | | When contracts or data flows change |
| End-to-end | | Before release or risky workflow changes |
| Lint and typecheck | | Before every review |

## Strategy

Map test coverage to user and operational risk instead of only counting files.

| Risk | Test type | Fixtures or data | Owner |
| --- | --- | --- | --- |
| | | | |

## Expectations

- New behavior has focused tests.
- Bug fixes include a regression test when practical.
- Tests avoid relying on shared mutable state.
- Slow or flaky tests are documented with an owner.

## Manual Checks

List workflows that still need human verification and the exact expected result.

## Known Gaps

- Gap:
- Impact:
- Planned fix:
`),
			doc('development-contributing', 'Contributing', '02_development/contributing.md', 'process', 3, `## Before You Start

- Find or create an issue.
- Confirm expected behavior and non-goals.
- Check related documentation, ADRs, and open pull requests.
- Identify code owners or reviewers.

## Pull Requests

Each pull request should include:

- Summary of user-visible or operational impact.
- Test evidence.
- Documentation updates or a reason none are needed.
- Screenshots or logs for UI and operational changes.
- Rollout or rollback notes when relevant.

## Communication

| Situation | Channel or owner | Expected response |
| --- | --- | --- |
| Breaking change | | |
| Security concern | | |
| Release coordination | | |

## Documentation Updates

Update Pinake docs when the change affects setup, architecture, operations, configuration, or contributor workflow.
`),
			doc('development-coding-standards', 'Coding Standards', '02_development/coding-standards.md', 'reference', 4, `## Style

Document local conventions that are not obvious from tooling.

| Area | Convention | Example or reference |
| --- | --- | --- |
| Naming | | |
| Error handling | | |
| File organization | | |
| Logging | | |

## Patterns

Which project patterns should contributors reuse for services, UI, data access, configuration, testing, and background work?

## Dependencies

- Preferred libraries:
- Approval needed for:
- Runtime or bundle constraints:

## Avoid

- Known pitfalls:
- Patterns that caused incidents:
- APIs or modules that are deprecated:

## Security and Privacy Notes

Capture validation, authorization, secret handling, and data minimization practices that apply to everyday coding.
`),
		],
	},
	{
		id: 'decisions',
		title: 'Decisions / ADR',
		folder: '03_decisions',
		documents: [
			doc('decisions-adr-0001-example', 'ADR-0001: Example Decision', '03_decisions/ADR-0001-example.md', 'adr', 1, `## Status

Proposed

## Context

What problem, constraint, or tradeoff requires a decision?

## Decision Drivers

- User or business need:
- Technical constraints:
- Operational constraints:
- Security or privacy considerations:
- Time or migration constraints:

## Options Considered

| Option | Benefits | Tradeoffs | Why not chosen |
| --- | --- | --- | --- |
| | | | |

## Decision

What are we choosing, and what does this require the team to do?

## Consequences

- What gets easier?
- What gets harder?
- What needs to be revisited later?

## Review Trigger

Name the condition, date, metric, or incident that should cause this decision to be revisited.
`),
		],
	},
	{
		id: 'architecture',
		title: 'Architecture',
		folder: '04_architecture',
		documents: [
			doc('architecture-context', 'System Context', '04_architecture/context.md', 'architecture', 1, `## Users and Actors

| Actor | Goal | Entry point | Notes |
| --- | --- | --- | --- |
| | | | |

## External Systems

| System | Direction | Contract | Failure impact | Owner |
| --- | --- | --- | --- | --- |
| | | | | |

## Boundaries

Describe what is inside and outside this project's responsibility.

## Data and Trust

- What data enters the system?
- What data leaves the system?
- Which inputs are trusted?
- Which inputs require validation or authorization?

## Context Diagram

Add a diagram or link to the source of truth. Keep the diagram focused on users, systems, and trust boundaries.
`),
			doc('architecture-containers', 'Containers', '04_architecture/containers.md', 'architecture', 2, `## Runtime Units

| Unit | Responsibility | Runtime | Owner | Health signal |
| --- | --- | --- | --- | --- |
| | | | | |

## Responsibilities

Explain which unit owns each major capability and where responsibilities intentionally stop.

## Communication

| Source | Target | Protocol or mechanism | Sync or async | Failure behavior |
| --- | --- | --- | --- | --- |
| | | | | |

## Deployment Shape

Document how runtime units are packaged, deployed, scaled, and configured per environment.

## Failure Modes

- Dependency unavailable:
- Data store unavailable:
- Partial deploy:
- Slow downstream system:
`),
			doc('architecture-overview', 'Architecture Overview', '04_architecture/architecture-overview.md', 'architecture', 3, `## Shape of the System

Describe the main architectural approach in practical terms.

## Data Flow

List the important flows from request, event, or scheduled trigger through storage and response.

| Flow | Trigger | Main components | Output | Risk |
| --- | --- | --- | --- | --- |
| | | | | |

## Important Decisions

Link to ADRs or explain the constraints that shaped the design.

## Known Risks

| Risk | Impact | Mitigation | Owner |
| --- | --- | --- | --- |
| | | | |

## Evolution

Describe known scaling, modularity, migration, or deprecation plans.
`),
		],
	},
	{
		id: 'quality',
		title: 'Quality',
		folder: '05_quality',
		documents: [
			doc('quality-testing-strategy', 'Testing Strategy', '05_quality/testing-strategy.md', 'testing', 1, `## Coverage

| Area | Risk covered | Automated test type | Manual check |
| --- | --- | --- | --- |
| | | | |

## Manual Checks

Document checks that still need a human and include exact expected outcomes.

## Test Data

- Fixture source:
- Generated data:
- Sensitive data restrictions:
- Reset process:

## Gaps

| Gap | Impact | Proposed improvement | Owner |
| --- | --- | --- | --- |
| | | | |

## Review Cadence

State how often coverage, flaky tests, and manual checks should be reviewed.
`),
			doc('quality-code-review', 'Code Review', '05_quality/code-review.md', 'process', 2, `## Review Goals

Review for correctness, maintainability, operational safety, and user impact.

## Required Checks

- Correctness and edge cases.
- Maintainability and fit with project patterns.
- Security or privacy impact.
- Test evidence.
- Documentation impact.
- Rollout and rollback notes for risky changes.

## Evidence

| Change type | Expected evidence |
| --- | --- |
| UI or UX | Screenshot or walkthrough |
| API or data contract | Contract or integration test |
| Operational behavior | Logs, metrics, or runbook update |
| Security-sensitive change | Threat or permission review |

## Escalation

Document who should be pulled into reviews for architecture, security, data, performance, or release-risk decisions.
`),
			doc('quality-metrics', 'Metrics', '05_quality/metrics.md', 'reference', 3, `## Product Metrics

Which usage, adoption, conversion, retention, or satisfaction metrics matter?

| Metric | Why it matters | Source | Review cadence |
| --- | --- | --- | --- |
| | | | |

## Engineering Metrics

Track build health, test health, defect rate, delivery flow, dependency freshness, and maintenance load.

## Operational Metrics

Track availability, latency, error rate, saturation, queue depth, and alert volume where relevant.

## Review Cadence

- Weekly:
- Monthly:
- Before release:
- After incident:
`),
		],
	},
	{
		id: 'operations',
		title: 'Operations',
		folder: '06_operations',
		documents: [
			doc('operations-deployment', 'Deployment', '06_operations/deployment.md', 'runbook', 1, `## Environments

| Environment | Purpose | Deployment trigger | Owner | Verification |
| --- | --- | --- | --- | --- |
| Local | Development | Manual | | |
| Staging | Pre-release validation | | | |
| Production | User traffic | | | |

## Release Steps

1. Confirm prerequisites and approvals.
2. Confirm migration or compatibility requirements.
3. Deploy using the documented command or pipeline.
4. Watch health signals.
5. Announce completion or rollback.

## Rollback

Document the fastest safe path to recover from a bad deploy, including data migration constraints.

## Verification

- Smoke test:
- Dashboard:
- Log query:
- User-facing check:
`),
			doc('operations-monitoring', 'Monitoring', '06_operations/monitoring.md', 'runbook', 2, `## Dashboards

| Dashboard | Purpose | Owner | Link or location |
| --- | --- | --- | --- |
| | | | |

## Alerts

| Alert | Severity | User impact | First response |
| --- | --- | --- | --- |
| | | | |

## Service-Level Indicators

- Availability:
- Latency:
- Error rate:
- Throughput:
- Freshness or queue depth:

## Health Checks

What confirms the system is working after deploy, dependency outage, or incident recovery?

## Ownership

Document who responds to alerts, who maintains dashboards, and how escalation works.
`),
			doc('operations-logging', 'Logging', '06_operations/logging.md', 'runbook', 3, `## Where Logs Live

| Source | Location | Retention | Access |
| --- | --- | --- | --- |
| Application | | | |
| Jobs or workers | | | |
| Infrastructure | | | |

## Useful Queries

| Investigation | Query or filter | Expected signal |
| --- | --- | --- |
| Recent errors | | |
| Request trace | | |
| Deployment impact | | |

## Sensitive Data

Document data that must never be logged, masking rules, and the owner for log access reviews.

## Correlation

Explain how to connect logs with request IDs, user reports, traces, metrics, or deployments.
`),
			doc('operations-backups', 'Backups', '06_operations/backups.md', 'runbook', 4, `## Backup Scope

| Data or asset | Backup method | Frequency | Retention | Owner |
| --- | --- | --- | --- | --- |
| | | | | |

## Restore Procedure

1. Confirm the restore target and requested point in time.
2. Identify dependencies that must be stopped or isolated.
3. Restore into a safe environment first when possible.
4. Verify integrity before exposing restored data to users.

## Verification

- Last restore test:
- Expected recovery time:
- Expected recovery point:
- Integrity checks:

## Risks

Document data that is not backed up, manual steps, and any compliance or privacy constraints.
`),
			doc('operations-incident-response', 'Incident Response', '06_operations/incident-response.md', 'troubleshooting', 5, `## Severity

| Severity | User impact | Response target | Examples |
| --- | --- | --- | --- |
| Sev1 | | | |
| Sev2 | | | |
| Sev3 | | | |

## First Response

1. Confirm the symptom and scope.
2. Assign an incident lead.
3. Check recent deploys, dependency health, dashboards, and logs.
4. Decide whether to mitigate, rollback, or escalate.
5. Communicate status and next update time.

## Communication

| Audience | Channel | Owner | Update cadence |
| --- | --- | --- | --- |
| | | | |

## After Action

- Timeline:
- Root cause:
- What went well:
- What needs improvement:
- Follow-up tasks:
`),
		],
	},
	{
		id: 'projectManagement',
		title: 'Project Management',
		folder: '07_project-management',
		documents: [
			doc('project-management-roadmap', 'Roadmap', '07_project-management/roadmap.md', 'roadmap', 1, `## Now

| Outcome | Owner | Target | Status | Notes |
| --- | --- | --- | --- | --- |
| | | | | |

## Next

List work that is likely to start after the current priorities, including dependencies and decision points.

## Later

List ideas or obligations that are intentionally deferred.

## Risks and Dependencies

- Blocking dependency:
- Staffing or ownership risk:
- Technical uncertainty:
- External date:

## Review Cadence

Document when roadmap priorities are reviewed and how changes are communicated.
`),
			doc('project-management-changelog', 'Changelog', '07_project-management/changelog.md', 'changelog', 2, `## Unreleased

### Added

- Initial Pinake documentation scaffold.

### Changed

- 

### Fixed

- 

### Operational Notes

- 

## Guidelines

- Record user-facing, integration, operational, security, and documentation changes.
- Link release notes to issues, ADRs, migrations, or runbooks.
- Move entries from Unreleased into a dated version section during release.
`),
		],
	},
	{
		id: 'reference',
		title: 'Reference / Appendix',
		folder: '99_appendix',
		documents: [
			doc('reference-glossary', 'Glossary', '99_appendix/glossary.md', 'glossary', 1, `## Terms

| Term | Meaning | Source or owner |
| --- | --- | --- |
| | | |

## Acronyms

| Acronym | Expanded form | Notes |
| --- | --- | --- |
| | | |

## Domain Language

Capture names that have project-specific meaning, especially if they differ from common industry usage.

## Review

Assign an owner and review cadence so terminology stays aligned with product, architecture, and support language.
`),
			doc('reference-references', 'References', '99_appendix/references.md', 'reference', 2, `## Internal Links

| Resource | Purpose | Owner |
| --- | --- | --- |
| | | |

## External Links

| Resource | Purpose | Last checked |
| --- | --- | --- |
| | | |

## Standards and Policies

List security, privacy, accessibility, compliance, or engineering standards that apply to this project.

## Link Hygiene

- Prefer stable canonical links.
- Note paid, private, or permissioned resources.
- Review critical external links on a regular cadence.
`),
		],
	},
];

const fullProductHandbookModules: Partial<Record<PinakeModuleId, PinakeModuleDefinition>> = {
	overview: {
		id: 'overview',
		title: 'Overview',
		folder: '00_Overview',
		documents: [
			doc('full-overview', 'Overview', '00_Overview/Overview.md', 'overview', 1, `## Purpose

Describe the product, the user problem it solves, and the outcomes the team is accountable for.

## Audience

| Audience | Needs from this handbook | Contact or owner |
| --- | --- | --- |
| Product | | |
| Engineering | | |
| Operations | | |
| Support or success | | |

## Key Technologies

| Technology | Purpose | Owner | Notes |
| --- | --- | --- | --- |
| | | | |

## Status

- Lifecycle stage:
- Product owner:
- Engineering owner:
- Last reviewed:

## High-Value Links

- Roadmap:
- Architecture:
- Runbooks:
- Metrics:
`),
		],
	},
	gettingStarted: {
		id: 'gettingStarted',
		title: 'Getting Started',
		folder: '01_GettingStarted',
		documents: [
			doc('full-installation', 'Installation', '01_GettingStarted/Installation.md', 'tutorial', 1, `## Prerequisites

| Requirement | Version or access | Verification |
| --- | --- | --- |
| Runtime | | |
| Package manager | | |
| Accounts and permissions | | |

## Setup Steps

1. Clone the repository.
2. Install dependencies.
3. Create local configuration.
4. Start dependent services.
5. Run the project.

## First Verification

- Main entry point opens or responds.
- Tests or smoke checks pass.
- Logs show no missing configuration.

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| | | |
`),
			doc('full-configuration', 'Configuration', '01_GettingStarted/Configuration.md', 'reference', 2, `## Configuration Sources

| Source | Environment | Owner | Notes |
| --- | --- | --- | --- |
| Environment variables | | | |
| Config files | | | |
| Secret manager | | | |

## Required Values

| Name | Required | Default | Description |
| --- | --- | --- | --- |
| | | | |

## Secret Handling

Document where secrets live, who can rotate them, and what must never be committed.

## Validation

List the command, startup check, or CI job that confirms configuration is complete.
`),
			doc('full-deployment', 'Deployment', '01_GettingStarted/Deployment.md', 'runbook', 3, `## Environments

| Environment | Purpose | Deployment trigger | Verification |
| --- | --- | --- | --- |
| | | | |

## Release Path

1. Confirm version, approvals, and release notes.
2. Run build and test gates.
3. Deploy to the next environment.
4. Verify metrics, logs, and smoke checks.
5. Announce completion or rollback.

## Rollback

Document the supported rollback path and any data migration limits.
`),
		],
	},
	architecture: {
		id: 'architecture',
		title: 'Architecture',
		folder: '02_Architecture',
		documents: [
			doc('full-containers', 'Containers', '02_Architecture/Containers.md', 'architecture', 1, `## Runtime Units

| Unit | Responsibility | Runtime | Owner | Health signal |
| --- | --- | --- | --- | --- |
| | | | | |

## Communication

| Source | Target | Contract | Failure behavior |
| --- | --- | --- | --- |
| | | | |

## Deployment Shape

Describe packaging, scaling, configuration, and ownership for each runtime unit.
`),
			doc('full-context', 'Context', '02_Architecture/Context.md', 'architecture', 2, `## Users and External Systems

| Actor or system | Relationship | Contract | Owner |
| --- | --- | --- | --- |
| | | | |

## Boundaries

Describe what the product owns, what it depends on, and what is explicitly out of scope.

## Data and Trust Boundaries

- Trusted inputs:
- Untrusted inputs:
- Sensitive data:
- Authorization boundaries:
`),
		],
	},
	development: {
		id: 'development',
		title: 'Development',
		folder: '03_Development',
		documents: [
			doc('full-development-workflow', 'Workflow', '03_Development/Workflow.md', 'process', 1, `## Change Lifecycle

Document how work moves from idea to release.

| Stage | Owner | Required evidence |
| --- | --- | --- |
| Plan | | |
| Implement | | |
| Review | | |
| Release | | |

## Local Commands

| Task | Command | Notes |
| --- | --- | --- |
| Install | | |
| Build | | |
| Test | | |
`),
			doc('full-development-testing', 'Testing', '03_Development/Testing.md', 'testing', 2, `## Test Strategy

| Risk | Test coverage | Owner |
| --- | --- | --- |
| | | |

## Required Checks

- Typecheck or compile.
- Lint.
- Automated tests.
- Manual checks for workflows that automation does not cover.

## Gaps

Track known missing coverage, flaky tests, and planned improvements.
`),
			doc('full-development-standards', 'Coding Standards', '03_Development/CodingStandards.md', 'reference', 3, `## Conventions

| Area | Standard | Reference |
| --- | --- | --- |
| Naming | | |
| Error handling | | |
| Logging | | |

## Reusable Patterns

List local helpers, service patterns, and test patterns contributors should prefer.

## Avoid

Document deprecated APIs, risky shortcuts, and patterns that have caused defects.
`),
		],
	},
	quality: {
		id: 'quality',
		title: 'Quality',
		folder: '04_Quality',
		documents: [
			doc('full-code-review', 'Code Review', '04_Quality/CodeReview.md', 'process', 1, `## Review Expectations

Reviewers should check correctness, maintainability, tests, security or privacy impact, documentation impact, and release risk.

## Required Evidence

| Change type | Evidence |
| --- | --- |
| User-facing | Screenshot, walkthrough, or acceptance notes |
| API or data | Contract or integration test |
| Operational | Metrics, logs, or runbook update |

## Ownership

Document who must review architecture, security, data, and release-sensitive changes.
`),
			doc('full-metrics', 'Metrics', '04_Quality/Metrics.md', 'reference', 2, `## Product Metrics

| Metric | Source | Review cadence | Owner |
| --- | --- | --- | --- |
| | | | |

## Engineering Metrics

Track build health, test health, defect trends, delivery flow, and maintenance load.

## Operational Health

Track availability, latency, error rate, saturation, alert volume, and incident follow-up.
`),
			doc('full-testing', 'Testing', '04_Quality/Testing.md', 'testing', 3, `## Strategy

Map tests to the highest product and operational risks.

| Area | Automated checks | Manual checks | Gaps |
| --- | --- | --- | --- |
| | | | |

## Commands

| Scope | Command | When to run |
| --- | --- | --- |
| Unit | | |
| Integration | | |
| End-to-end | | |
`),
		],
	},
	operations: {
		id: 'operations',
		title: 'Operations',
		folder: '05_Operations',
		documents: [
			doc('full-backups', 'Backups', '05_Operations/Backups.md', 'runbook', 1, `## Scope

| Data or asset | Backup method | Frequency | Retention | Owner |
| --- | --- | --- | --- | --- |
| | | | | |

## Restore

Document the restore path, safety checks, expected recovery time, and expected recovery point.

## Verification

- Last restore test:
- Integrity check:
- Known limitations:
`),
			doc('full-logging', 'Logging', '05_Operations/Logging.md', 'runbook', 2, `## Sources

| Source | Location | Retention | Access |
| --- | --- | --- | --- |
| | | | |

## Common Investigations

| Investigation | Query or filter | Expected signal |
| --- | --- | --- |
| Errors after deploy | | |
| User report | | |

## Redaction

Document sensitive fields, masking rules, and access review ownership.
`),
			doc('full-monitoring', 'Monitoring', '05_Operations/Monitoring.md', 'runbook', 3, `## Dashboards

| Dashboard | Purpose | Owner | Link or location |
| --- | --- | --- | --- |
| | | | |

## Alerts

| Alert | Severity | User impact | First response |
| --- | --- | --- | --- |
| | | | |

## Service-Level Indicators

Document availability, latency, error rate, throughput, and freshness targets where relevant.
`),
		],
	},
	decisions: {
		id: 'decisions',
		title: 'Decisions / ADR',
		folder: '06_Decisions',
		documents: [
			doc('full-adr-example', 'ADR-0001: Example Decision', '06_Decisions/ADR-0001-ExampleDecision.md', 'adr', 1, `## Status

Proposed

## Context

Describe the problem, constraints, and forces that shaped the decision.

## Options Considered

| Option | Benefits | Tradeoffs | Outcome |
| --- | --- | --- | --- |
| | | | |

## Decision

Describe the decision and the responsibilities it creates.

## Consequences

- Describe the main positive outcomes.
- Describe the main tradeoffs and risks.
- Define when this decision should be revisited.
`),
		],
	},
	projectManagement: {
		id: 'projectManagement',
		title: 'Project Management',
		folder: '07_ProjectManagement',
		documents: [
			doc('full-changelog', 'Changelog', '07_ProjectManagement/Changelog.md', 'changelog', 1, `## Unreleased

### Added

- Initial Pinake scaffold.

### Changed

- 

### Fixed

- 

## Guidelines

Capture user-facing, operational, integration, security, and documentation changes before each release.
`),
			doc('full-roadmap', 'Roadmap', '07_ProjectManagement/Roadmap.md', 'roadmap', 2, `## Now

| Outcome | Owner | Target | Status |
| --- | --- | --- | --- |
| | | | |

## Next

Document planned work, dependencies, and decision points.

## Later

Record deferred work with a reason so it can be revisited deliberately.
`),
		],
	},
	reference: {
		id: 'reference',
		title: 'Reference / Appendix',
		folder: '99_Appendix',
		documents: [
			doc('full-glossary', 'Glossary', '99_Appendix/Glossary.md', 'glossary', 1, `## Terms

| Term | Meaning | Source or owner |
| --- | --- | --- |
| | | |

## Acronyms

| Acronym | Expanded form | Notes |
| --- | --- | --- |
| | | |
`),
			doc('full-references', 'References', '99_Appendix/References.md', 'reference', 2, `## Internal Links

| Resource | Purpose | Owner |
| --- | --- | --- |
| | | |

## External Links

| Resource | Purpose | Last checked |
| --- | --- | --- |
| | | |

## Standards

List security, privacy, accessibility, compliance, or engineering standards that apply.
`),
		],
	},
};

export const allPinakeModuleIds: PinakeModuleId[] = [
	'overview',
	'gettingStarted',
	'development',
	'decisions',
	'architecture',
	'quality',
	'operations',
	'projectManagement',
	'reference',
];

export const pinakeTemplateDefinitions: PinakeTemplateDefinition[] = [
	{
		id: 'minimal-internal-docs',
		title: 'Minimal Internal Docs',
		description: 'Lightweight starter docs for small projects that need setup, workflow, decisions, and references without operational overhead.',
		defaultModules: ['overview', 'gettingStarted', 'development', 'decisions', 'reference'],
		recommendedModules: ['quality', 'projectManagement'],
	},
	{
		id: 'product-project-docs',
		title: 'Product / Project Docs',
		description: 'Product and delivery documentation for teams that need shared context, onboarding, decisions, roadmap, and changelog.',
		defaultModules: ['overview', 'gettingStarted', 'development', 'decisions', 'projectManagement', 'reference'],
		recommendedModules: ['architecture', 'quality'],
	},
	{
		id: 'technical-architecture',
		title: 'Technical Architecture',
		description: 'Architecture-centered documentation for teams that need system context, runtime boundaries, ADRs, and quality evidence.',
		defaultModules: ['overview', 'gettingStarted', 'architecture', 'decisions', 'quality', 'reference'],
		recommendedModules: ['development', 'operations'],
	},
	{
		id: 'api-service-docs',
		title: 'API / Service Docs',
		description: 'Service documentation for API, backend, SDK, or integration projects with setup, architecture, quality, and operations coverage.',
		defaultModules: ['overview', 'gettingStarted', 'development', 'decisions', 'architecture', 'quality', 'operations', 'reference'],
		recommendedModules: ['projectManagement'],
	},
	{
		id: 'operations-runbook',
		title: 'Operations / Runbook',
		description: 'Production-oriented documentation for deployment, monitoring, logging, backups, incidents, and operational handoff.',
		defaultModules: ['overview', 'gettingStarted', 'decisions', 'operations', 'reference'],
		recommendedModules: ['architecture', 'quality'],
	},
	{
		id: 'full-product-handbook',
		title: 'Full Product Handbook',
		description: 'Complete product, engineering, quality, operations, and reference handbook with legacy-style capitalized folder names.',
		defaultModules: allPinakeModuleIds,
		moduleOverrides: fullProductHandbookModules,
	},
];

export function getDefaultPinakeTemplate(): PinakeTemplateDefinition {
	return pinakeTemplateDefinitions[0];
}

export function getPinakeTemplate(id: string | undefined): PinakeTemplateDefinition {
	return pinakeTemplateDefinitions.find((template) => template.id === id) ?? getDefaultPinakeTemplate();
}

export function getPinakeModuleDefinition(template: PinakeTemplateDefinition, moduleId: PinakeModuleId): PinakeModuleDefinition {
	const override = template.moduleOverrides?.[moduleId];
	if (override) {
		return override;
	}

	const definition = pinakeModuleDefinitions.find((moduleDefinition) => moduleDefinition.id === moduleId);
	if (!definition) {
		throw new Error(`Unknown Pinake module: ${moduleId}`);
	}

	return definition;
}

export function getPinakeModuleDefinitions(template: PinakeTemplateDefinition, moduleIds: PinakeModuleId[]): PinakeModuleDefinition[] {
	return moduleIds.map((moduleId) => getPinakeModuleDefinition(template, moduleId));
}

export function getPinakeDocuments(template: PinakeTemplateDefinition, moduleIds: PinakeModuleId[]): PinakeDocumentDefinition[] {
	return getPinakeModuleDefinitions(template, moduleIds).flatMap((moduleDefinition) => moduleDefinition.documents);
}

function doc(
	id: string,
	title: string,
	path: string,
	type: PinakeDocumentType,
	order: number,
	body: string,
	status: PinakeDocumentStatus = 'draft',
): PinakeDocumentDefinition {
	return {
		id,
		title,
		path,
		type,
		status,
		order,
		content: renderMarkdown(title, type, status, order, body),
	};
}

function renderMarkdown(
	title: string,
	type: PinakeDocumentType,
	status: PinakeDocumentStatus,
	order: number,
	body: string,
): string {
	return `---
title: ${JSON.stringify(title)}
type: ${type}
status: ${status}
order: ${order}
---

# ${title}

${body.trim()}
`;
}
