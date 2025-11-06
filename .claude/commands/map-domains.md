---
description: Analyze codebase and create comprehensive domain map in .requirements/domains.md
argument-hint: [optional-path]
model: sonnet
allowed-tools: Task
---

# Map Codebase Domains

Analyze the codebase and partition it into logical feature domains with complete coverage.

## Task

Create a comprehensive domain map that:
- Identifies all functional and technical domains
- Maps every file and code path to a domain
- Documents entry points and dependencies
- Provides clear domain descriptions and boundaries

## Target Path

Analyze codebase at: **${1:-.}**

## Execution

Use the **codebase-domain-mapper** subagent to:

1. Explore the file tree structure
2. Read documentation (README, ARCHITECTURE, docs/)
3. Analyze code organization patterns
4. Identify distinct feature domains
5. Map all code paths to domains
6. Create `.requirements/` directory
7. Generate `.requirements/domains.md` with complete domain map

## Expected Output

The subagent will create `.requirements/domains.md` containing:

- **Domain Summary**: Overview table with all domains
- **Core Business Domains**: User-facing features (Auth, User Management, Payments, etc.)
- **Technical Domains**: Infrastructure concerns (API Layer, Database, Caching, etc.)
- **Integration Domains**: External service integrations (Email, Payment Gateway, etc.)
- **Supporting Domains**: Utilities, shared libraries, common components

For each domain:
- Clear description and scope
- Complete list of code paths
- Entry points (API endpoints, UI routes, CLI commands)
- Dependencies on other domains
- Complexity assessment

**Coverage**: Every file in the codebase will be mapped to at least one domain.

## Launch Subagent

Execute the codebase-domain-mapper subagent now to analyze and create the domain map.
