import { TemplateFile } from '../types';

export function createCoreTemplates(projectName: string): TemplateFile[] {
	return [
		{
			relativePath: '00_Overview/Overview.md',
			content: `---
title: Overview
order: 1
---
# Overview

This project, **${projectName}**, is designed to describe the product, its goals, and its audience.

## Key Technologies

- Add the main languages, frameworks, services, and platforms here.

## Status

- Draft
`,
		},
		{
			relativePath: '01_GettingStarted/Installation.md',
			content: `---
title: Installation
order: 1
---
# Installation

Document prerequisites, local setup, dependency installation, and first-run commands.
`,
		},
		{
			relativePath: '01_GettingStarted/Configuration.md',
			content: `---
title: Configuration
order: 2
---
# Configuration

Document environment variables, configuration files, and local defaults.
`,
		},
		{
			relativePath: '01_GettingStarted/Deployment.md',
			content: `---
title: Deployment
order: 3
---
# Deployment

Document how to deploy the project to each supported environment.
`,
		},
		{
			relativePath: '02_Architecture/Context.md',
			content: `---
title: Context
order: 1
---
# Context

Describe users, external systems, boundaries, and important dependencies.
`,
		},
		{
			relativePath: '02_Architecture/Containers.md',
			content: `---
title: Containers
order: 2
---
# Containers

Describe the main applications, services, databases, and infrastructure components.
`,
		},
		{
			relativePath: '04_Quality/Testing.md',
			content: `---
title: Testing
order: 1
---
# Testing

Document the testing strategy, commands, environments, and coverage expectations.
`,
		},
		{
			relativePath: '04_Quality/CodeReview.md',
			content: `---
title: Code Review
order: 2
---
# Code Review

Document review expectations, ownership rules, and approval requirements.
`,
		},
		{
			relativePath: '04_Quality/Metrics.md',
			content: `---
title: Metrics
order: 3
---
# Metrics

Document quality metrics, coverage targets, and operational health indicators.
`,
		},
		{
			relativePath: '05_Operations/Logging.md',
			content: `---
title: Logging
order: 1
---
# Logging

Document log formats, retention, redaction, and how to inspect logs.
`,
		},
		{
			relativePath: '05_Operations/Monitoring.md',
			content: `---
title: Monitoring
order: 2
---
# Monitoring

Document dashboards, alerts, service-level indicators, and escalation paths.
`,
		},
		{
			relativePath: '05_Operations/Backups.md',
			content: `---
title: Backups
order: 3
---
# Backups

Document backup frequency, storage, restore steps, and verification procedures.
`,
		},
		{
			relativePath: '06_Decisions/ADR-0001-ExampleDecision.md',
			content: `# ADR-0001: Example Decision

**Status:** Proposed

## Context

Describe the problem, constraints, and forces that shaped the decision.

## Decision

Describe the decision.

## Consequences

- Describe the main positive outcomes.
- Describe the main tradeoffs and risks.
`,
		},
		{
			relativePath: '07_ProjectManagement/Roadmap.md',
			content: `---
title: Roadmap
order: 1
---
# Roadmap

Document milestones, target dates, and major planned work.
`,
		},
		{
			relativePath: '07_ProjectManagement/Changelog.md',
			content: `---
title: Changelog
order: 2
---
# Changelog

## Unreleased

- Initial Pinake scaffold.
`,
		},
		{
			relativePath: '99_Appendix/Glossary.md',
			content: `---
title: Glossary
order: 1
---
# Glossary

Define project-specific terms, acronyms, and domain language.
`,
		},
		{
			relativePath: '99_Appendix/References.md',
			content: `---
title: References
order: 2
---
# References

List useful links, standards, and external documentation.
`,
		},
	];
}
