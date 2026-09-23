# 0005: Documentation is part of delivery

- Status: Superseded in part by [ADR 0006](0006-private-source-hosting-with-local-checks.md); documentation ownership and same-change updates remain accepted
- Recorded: 2026-09-22
- Supersedes: None

## Context

The owner requested a durable knowledge base for developers and LLMs, including progress, architecture decisions, instructions, a friendly GitHub README, and screenshots. Standalone prose can drift as code changes.

## Decision

Keep documentation in Git beside source. Define required updates in AGENTS/CONTRIBUTING and the PR template. Maintain current guides, historical ADRs, a dated progress log, generated package/model reference, and reproducible sample-data screenshots. Check links, generated content, and source-to-documentation participation in CI.

## Alternatives

An external wiki separates documentation from code review and is unavailable in this repository by default. Purely generated documentation cannot explain intent or tradeoffs. A scheduled reminder alone cannot validate change-specific knowledge transfer. We use source-controlled prose plus targeted generation and checks.

## Consequences

Authors and reviewers must update affected docs in the same change. Automated checks catch missing updates and broken references, but cannot guarantee semantic freshness. ADR history must be superseded, not silently rewritten. Screenshots must avoid user data and be reviewed after relevant UI changes. No unattended maintenance service is implied.

## Evidence and documentation

See [maintenance](../maintenance.md), [instructions](../../AGENTS.md), [contributing](../../CONTRIBUTING.md), and [documentation checks](../../scripts/check-docs.mjs). New change categories must update the impact map as needed.

Operational guidance added 2026-09-23: [handoff](../handoff.md) defines takeover, completion evidence, and interrupted-work transfer. Hosted checks remain superseded by ADR 0006; same-change documentation ownership still applies to every direct commit and PR.
