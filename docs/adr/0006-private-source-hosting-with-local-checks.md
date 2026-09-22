# 0006: Private source hosting with local checks

- Status: Accepted
- Recorded: 2026-09-22
- Supersedes: The CI requirement in [ADR 0005](0005-documentation-as-part-of-delivery.md)

## Context

During repository onboarding, the owner clarified that GitHub should provide a private home for the code and that CI/CD is not desired.

## Decision

Keep `mtom2k/keepad` private, store source and documentation in Git, and run relevant validation locally. Remove the GitHub Actions workflow and stop its current run. Preserve the existing local tests, documentation checks, screenshot tooling, and contributor instructions. Do not add CI/CD unless the owner explicitly requests it.

## Alternatives

Hosted checks can enforce rules on every push, but introduce automation and maintenance the owner does not want. Removing local checks would unnecessarily weaken development guidance.

## Consequences

Documentation updates remain part of each code change. Authors are responsible for running local checks; GitHub does not enforce them. Historical runner outcomes remain in progress as historical evidence, without implying an ongoing workflow or complete platform certification.
