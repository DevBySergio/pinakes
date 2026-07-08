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

What does this project do?

## Problem

What problem does it solve?

## Audience

Who uses, operates, or maintains this project?

## Current Status

- Draft
`),
			doc('overview-product-context', 'Product Context', '00_overview/product-context.md', 'explanation', 2, `## Background

Why does this project exist?

## Goals

- What outcomes matter most?
- What should this project deliberately avoid?

## Stakeholders

List the people or teams who depend on this project.
`),
		],
	},
	{
		id: 'gettingStarted',
		title: 'Getting Started',
		folder: '01_getting-started',
		documents: [
			doc('getting-started-installation', 'Installation', '01_getting-started/installation.md', 'tutorial', 1, `## Prerequisites

- Required tools
- Required accounts or permissions

## Install

Document the commands needed to install dependencies.

## First Run

Document the shortest path to verify the project works locally.
`),
			doc('getting-started-local-setup', 'Local Setup', '01_getting-started/local-setup.md', 'how-to', 2, `## Local Environment

What services, variables, and files are needed for local development?

## Common Commands

| Task | Command |
| --- | --- |
| Install dependencies | |
| Start locally | |
| Run tests | |
`),
			doc('getting-started-configuration', 'Configuration', '01_getting-started/configuration.md', 'reference', 3, `## Configuration Sources

Where does runtime configuration come from?

## Environment Variables

| Name | Required | Description |
| --- | --- | --- |
| | | |
`),
		],
	},
	{
		id: 'development',
		title: 'Development',
		folder: '02_development',
		documents: [
			doc('development-workflow', 'Development Workflow', '02_development/workflow.md', 'process', 1, `## Branching

How should changes move from idea to merge?

## Review

What does a useful review check for?

## Release Handoff

What should be true before a change is released or handed off?
`),
			doc('development-testing', 'Testing', '02_development/testing.md', 'testing', 2, `## Test Commands

| Scope | Command |
| --- | --- |
| Unit | |
| Integration | |
| End-to-end | |

## Expectations

What should contributors test before opening a change?
`),
			doc('development-contributing', 'Contributing', '02_development/contributing.md', 'process', 3, `## Before You Start

- Find or create an issue.
- Confirm the expected behavior.
- Check related documentation.

## Pull Requests

What should each pull request include?
`),
			doc('development-coding-standards', 'Coding Standards', '02_development/coding-standards.md', 'reference', 4, `## Style

Document local conventions that are not obvious from tooling.

## Patterns

Which project patterns should contributors reuse?

## Avoid

List known pitfalls or discouraged approaches.
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

## Decision

What are we choosing?

## Consequences

- What gets easier?
- What gets harder?
- What needs to be revisited later?
`),
		],
	},
	{
		id: 'architecture',
		title: 'Architecture',
		folder: '04_architecture',
		documents: [
			doc('architecture-context', 'System Context', '04_architecture/context.md', 'architecture', 1, `## Users and Actors

Who interacts with this system?

## External Systems

Which services, data stores, or teams does this project depend on?

## Boundaries

What is inside and outside this project's responsibility?
`),
			doc('architecture-containers', 'Containers', '04_architecture/containers.md', 'architecture', 2, `## Runtime Units

List the applications, services, workers, databases, and queues.

## Responsibilities

What is each unit responsible for?

## Communication

How do the units talk to each other?
`),
			doc('architecture-overview', 'Architecture Overview', '04_architecture/architecture-overview.md', 'architecture', 3, `## Shape of the System

Describe the main architectural approach in practical terms.

## Important Decisions

Link to ADRs or explain the constraints that shaped the design.

## Known Risks

What parts need extra care?
`),
		],
	},
	{
		id: 'quality',
		title: 'Quality',
		folder: '05_quality',
		documents: [
			doc('quality-testing-strategy', 'Testing Strategy', '05_quality/testing-strategy.md', 'testing', 1, `## Coverage

What risks are covered by automated tests?

## Manual Checks

What still needs human verification?

## Gaps

Which areas need better test coverage?
`),
			doc('quality-code-review', 'Code Review', '05_quality/code-review.md', 'process', 2, `## Review Goals

What should reviewers focus on?

## Required Checks

- Correctness
- Maintainability
- Security or privacy impact
- Documentation impact
`),
			doc('quality-metrics', 'Metrics', '05_quality/metrics.md', 'reference', 3, `## Product Metrics

Which usage or outcome metrics matter?

## Engineering Metrics

Which quality, build, and operational signals matter?

## Review Cadence

When should the team review these metrics?
`),
		],
	},
	{
		id: 'operations',
		title: 'Operations',
		folder: '06_operations',
		documents: [
			doc('operations-deployment', 'Deployment', '06_operations/deployment.md', 'runbook', 1, `## Environments

List deployment environments and their purpose.

## Release Steps

Document the safest known deployment path.

## Rollback

How do you recover from a bad deploy?
`),
			doc('operations-monitoring', 'Monitoring', '06_operations/monitoring.md', 'runbook', 2, `## Dashboards

Where do maintainers check system health?

## Alerts

Which alerts matter, and who owns them?

## Health Checks

What confirms the system is working?
`),
			doc('operations-logging', 'Logging', '06_operations/logging.md', 'runbook', 3, `## Where Logs Live

How do maintainers find logs?

## Useful Queries

Add examples for common investigations.

## Sensitive Data

What must never be logged?
`),
			doc('operations-backups', 'Backups', '06_operations/backups.md', 'runbook', 4, `## Backup Scope

What data must be backed up?

## Restore Procedure

Document the restore steps before they are needed.

## Verification

How do you know backups are usable?
`),
			doc('operations-incident-response', 'Incident Response', '06_operations/incident-response.md', 'troubleshooting', 5, `## Severity

How does the team classify incidents?

## First Response

What should the first responder check?

## After Action

What should be documented after the incident?
`),
		],
	},
	{
		id: 'projectManagement',
		title: 'Project Management',
		folder: '07_project-management',
		documents: [
			doc('project-management-roadmap', 'Roadmap', '07_project-management/roadmap.md', 'roadmap', 1, `## Now

What is actively being worked on?

## Next

What is likely to happen soon?

## Later

What is intentionally deferred?
`),
			doc('project-management-changelog', 'Changelog', '07_project-management/changelog.md', 'changelog', 2, `## Unreleased

- Initial Pinake documentation scaffold.

## Guidelines

Record user-facing or operationally important changes as they happen.
`),
		],
	},
	{
		id: 'reference',
		title: 'Reference / Appendix',
		folder: '99_appendix',
		documents: [
			doc('reference-glossary', 'Glossary', '99_appendix/glossary.md', 'glossary', 1, `## Terms

| Term | Meaning |
| --- | --- |
| | |

Add project-specific acronyms, domain language, and shorthand.
`),
			doc('reference-references', 'References', '99_appendix/references.md', 'reference', 2, `## Internal Links

- 

## External Links

- 

Keep links that help maintainers understand the project quickly.
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

Describe the product, its goals, and its audience.

## Key Technologies

- Add the main languages, frameworks, services, and platforms here.

## Status

- Draft
`),
		],
	},
	gettingStarted: {
		id: 'gettingStarted',
		title: 'Getting Started',
		folder: '01_GettingStarted',
		documents: [
			doc('full-installation', 'Installation', '01_GettingStarted/Installation.md', 'tutorial', 1, 'Document prerequisites, local setup, dependency installation, and first-run commands.'),
			doc('full-configuration', 'Configuration', '01_GettingStarted/Configuration.md', 'reference', 2, 'Document environment variables, configuration files, secrets handling, and local defaults.'),
			doc('full-deployment', 'Deployment', '01_GettingStarted/Deployment.md', 'runbook', 3, 'Document how to deploy the project to each supported environment.'),
		],
	},
	architecture: {
		id: 'architecture',
		title: 'Architecture',
		folder: '02_Architecture',
		documents: [
			doc('full-containers', 'Containers', '02_Architecture/Containers.md', 'architecture', 1, 'Describe the main applications, services, databases, and infrastructure components.'),
			doc('full-context', 'Context', '02_Architecture/Context.md', 'architecture', 2, 'Describe users, external systems, boundaries, and important dependencies.'),
		],
	},
	development: {
		id: 'development',
		title: 'Development',
		folder: '03_Development',
		documents: [],
	},
	quality: {
		id: 'quality',
		title: 'Quality',
		folder: '04_Quality',
		documents: [
			doc('full-code-review', 'Code Review', '04_Quality/CodeReview.md', 'process', 1, 'Document review expectations, ownership rules, and approval requirements.'),
			doc('full-metrics', 'Metrics', '04_Quality/Metrics.md', 'reference', 2, 'Document quality metrics, coverage targets, and operational health indicators.'),
			doc('full-testing', 'Testing', '04_Quality/Testing.md', 'testing', 3, 'Document the testing strategy, commands, environments, and coverage expectations.'),
		],
	},
	operations: {
		id: 'operations',
		title: 'Operations',
		folder: '05_Operations',
		documents: [
			doc('full-backups', 'Backups', '05_Operations/Backups.md', 'runbook', 1, 'Document backup frequency, storage, restore steps, and verification procedures.'),
			doc('full-logging', 'Logging', '05_Operations/Logging.md', 'runbook', 2, 'Document log formats, retention, redaction, and how to inspect logs.'),
			doc('full-monitoring', 'Monitoring', '05_Operations/Monitoring.md', 'runbook', 3, 'Document dashboards, alerts, service-level indicators, and escalation paths.'),
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

## Decision

Describe the decision.

## Consequences

- Describe the main positive outcomes.
- Describe the main tradeoffs and risks.
`),
		],
	},
	projectManagement: {
		id: 'projectManagement',
		title: 'Project Management',
		folder: '07_ProjectManagement',
		documents: [
			doc('full-changelog', 'Changelog', '07_ProjectManagement/Changelog.md', 'changelog', 1, `## Unreleased

- Initial Pinake scaffold.
`),
			doc('full-roadmap', 'Roadmap', '07_ProjectManagement/Roadmap.md', 'roadmap', 2, 'Document milestones, target dates, and major planned work.'),
		],
	},
	reference: {
		id: 'reference',
		title: 'Reference / Appendix',
		folder: '99_Appendix',
		documents: [
			doc('full-glossary', 'Glossary', '99_Appendix/Glossary.md', 'glossary', 1, 'Define project-specific terms, acronyms, and domain language.'),
			doc('full-references', 'References', '99_Appendix/References.md', 'reference', 2, 'List useful links, standards, and external documentation.'),
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
		description: 'Lightweight documentation for small projects, individual developers, and small teams.',
		defaultModules: ['overview', 'gettingStarted', 'development', 'decisions', 'reference'],
	},
	{
		id: 'product-project-docs',
		title: 'Product / Project Docs',
		description: 'Internal product/project documentation with overview, guides, reference, roadmap and changelog.',
		defaultModules: ['overview', 'gettingStarted', 'development', 'decisions', 'projectManagement', 'reference'],
	},
	{
		id: 'technical-architecture',
		title: 'Technical Architecture',
		description: 'Architecture-focused documentation inspired by practical system context, component thinking, and ADRs.',
		defaultModules: ['overview', 'gettingStarted', 'architecture', 'decisions', 'quality', 'reference'],
	},
	{
		id: 'api-service-docs',
		title: 'API / Service Docs',
		description: 'Documentation for APIs, backend services, SDKs, and internal services.',
		defaultModules: ['overview', 'gettingStarted', 'development', 'decisions', 'architecture', 'quality', 'operations', 'reference'],
	},
	{
		id: 'operations-runbook',
		title: 'Operations / Runbook',
		description: 'Production-oriented docs including deployment, monitoring, logging, backups and incident response.',
		defaultModules: ['overview', 'gettingStarted', 'decisions', 'operations', 'reference'],
	},
	{
		id: 'full-product-handbook',
		title: 'Full Product Handbook',
		description: 'Complete internal documentation structure similar to the current Pinake structure.',
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
