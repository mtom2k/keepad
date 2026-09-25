# KeePad knowledge base

Use this index for onboarding. Documentation describes the current implementation unless explicitly marked planned or unverified.

Documentation and implementation are delivered together. Authors maintain the affected guides throughout development and reconcile them before handoff; a passing link/reference check alone does not establish accuracy.

| Document | Purpose |
| --- | --- |
| [Project README](../README.md) | What KeePad does, screenshots, and getting started |
| [Contributor instructions](../AGENTS.md) | Rules for developers and coding agents |
| [Contributing](../CONTRIBUTING.md) | Setup, validation, and the change workflow |
| [Handoff procedure](handoff.md) | Taking over, completing, and transferring unfinished work |
| [Progress](progress.md) | Current state, completed milestones, evidence, and next work |
| [Architecture](architecture.md) | Process boundaries, runtime flows, and code map |
| [Retired synchronization](synchronization.md) | Local-only upgrade, preserved destinations, recovery, and former folders |
| [Data model](data-model.md) | State, limits, persistence, and backup behavior |
| [UX rules](ux.md) | Intended interaction and visual behavior |
| [ADRs](adr/README.md) | Accepted architectural decisions and their rationale |
| [Testing](testing.md) | Checks, screenshot regeneration, and coverage limits |
| [Releasing](releasing.md) | Packaging, signing prerequisites, and release checks |
| [Troubleshooting](troubleshooting.md) | Known issues and operational lessons |
| [Generated reference](reference.md) | Commands, exact dependency versions, defaults, and allowed choices |
| [Documentation maintenance](maintenance.md) | Update ownership and automated safeguards |
| [Screenshot notes](screenshots/README.md) | Image provenance and refresh workflow |

## Reading order

For a new developer or LLM: instructions → handoff → progress → architecture → relevant ADR → current source → relevant tests. For a user: project README → troubleshooting. For a release owner: progress → testing → releasing.

## Sources of truth

- `package.json` / `package-lock.json`: package version, scripts, build identity, and resolved dependencies.
- `shared/model.ts`: persisted-state validation and shared API types.
- `electron/main.ts` / `electron/preload.cts`: privileged behavior and IPC boundaries.
- `src/main.tsx` / `src/components.tsx` / `src/styles.css`: current UI behavior.
- Local test results and historical onboarding runs: evidence for the recorded revision/platform, not assertions that every OS behavior has been exercised. No GitHub CI/CD is configured.

If prose and code disagree, investigate and update both as needed. Accepted ADRs record historical rationale; a later superseding ADR explains deliberate changes.
