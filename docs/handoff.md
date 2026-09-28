# Developer and AI handoff

Use this procedure at the start and end of development work. Keep current product status in [progress](progress.md), behavior in the relevant guide, and durable decisions in [ADRs](adr/README.md); this document defines the process rather than duplicating those facts.

## Taking over

1. Read [AGENTS.md](../AGENTS.md), [the documentation index](README.md), current progress, architecture, and the relevant ADRs.
2. Inspect `git status --short`, the current branch, and `git log -5 --oneline`. Record the starting revision for the documentation-impact comparison. Distinguish committed code, local changes, generated builds, and the running app; a running bundle may predate the checkout.
   Fetch the configured remote before a whole-project audit and compare local and remote history. If a clean checkout is behind its upstream, fast-forward before auditing and record the updated source revision. Preserve local edits/divergent commits; never reset them to make the histories agree. A stale checkout cannot establish the current GitHub documentation status.
3. Read the source and tests for the intended change. Check the user's current instructions against recorded decisions. Investigate contradictory claims; correct stale prose without treating it as an instruction to change working behavior.
4. Find outstanding limitations in progress/troubleshooting. Treat historical test results as evidence for the tested revision/platform, not certification of later changes.
5. Use the local commands in [CONTRIBUTING.md](../CONTRIBUTING.md). Test with disposable profiles and sample data. GitHub remains private source storage without CI/CD.

## Before completing work

- Update every affected current guide in the same change. Use [the change map](maintenance.md), including setup, compatibility, permissions, failure behavior, and limitations when relevant.
- Update progress's current-status table when facts change and add a dated outcome/evidence entry. Link the implementation revision or known prior milestone where useful; do not invent the hash of an uncommitted change.
- Capture reusable troubleshooting knowledge. Add or supersede an ADR for a consequential decision; preserve historical rationale and label superseded portions.
- Regenerate reference only when its inputs change. Refresh affected screenshots for visible UI changes and review them. Otherwise explain their continued applicability; do not change dates just to imply freshness.
- Run local documentation checks and the meaningful base comparison after staging new files. Inspect the staged diff and ensure the documentation corresponds to the code being delivered.
- State the actual tests/platforms and remaining gaps. Record commit/push status and any rebuilt application separately. A source push does not update an installed application.

For direct commits, put this information in the progress entry and delivery summary. For PRs, also complete the repository's PR template. These are the same completion requirements, not separate quality levels.

## If work is interrupted

Add a clearly labeled **In progress** entry to progress before handing off. Include the objective, starting/current revision, modified files, completed steps, unresolved failures, and the next concrete action. Never put credentials, private snippets, or user-profile contents in a handoff.

Use this outline in a progress entry or PR; omit fields that do not apply with a brief reason:

```text
Date / objective:
Source revision and working-tree state:
Implemented behavior and relevant files:
Documentation / ADRs updated:
Validation actually run (command, platform, result):
Not verified / known limitations:
Screenshots and generated reference (refreshed or unchanged, why):
Build / running application / remote push status:
Unfinished work and next action:
```

Update an unfinished entry when resumed or completed so it does not become a second, stale task list. Requested roadmap ideas remain explicitly planned until implementation and evidence exist.
