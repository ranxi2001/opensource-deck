# OpenSourceDeck Agent Instructions

## Purpose

OpenSourceDeck is a public, owner-maintained project for a static personal
open-source contribution dashboard. The current phase is Milestone 0:
repository bootstrap and product requirements.

## Sources Of Truth

- `docs/PRD.md`: product behavior, security boundaries, scope, and acceptance.
- `README.md`: public project status and concise orientation.
- Source manifests and CI workflows: executable commands once implementation
  begins.
- This file: repository-wide engineering rules.

When these disagree, preserve security and privacy boundaries and update the
stale document in the same change.

## Product Invariants

- v0.1 is read-only and must not mutate GitHub state.
- v0.1 processes and publishes public GitHub data only.
- Tokens must never enter browser code, generated JSON, logs, or Pages
  artifacts.
- Every derived action state has deterministic reason codes.
- Repository identity always uses full `owner/name` coordinates.
- Missing CI, review, or timeline data is unknown, never success.
- The application opens on the operational dashboard, not a marketing page.

## Engineering Direction

- Keep GitHub API response types behind adapters.
- Validate configuration and generated data against versioned runtime schemas.
- Keep classifier logic pure and fixture-tested.
- Treat all GitHub-provided text and URLs as untrusted input.
- Use bounded concurrency and explicit pagination for API collection.
- Keep Pages deployment artifact-based; do not commit generated data.
- Prefer established libraries for parsing, schemas, accessibility, and test
  tooling rather than ad hoc implementations.

## Documentation Changes

Update `docs/PRD.md` when a change alters product scope, state classification,
data contracts, security boundaries, or acceptance criteria. Update `README.md`
when public status, setup, or delivered capability changes.

Do not describe planned PRD behavior as implemented.

## Validation

Until the application scaffold exists, documentation changes must pass:

```bash
git diff --check
```

Once implementation commands are added, record the exact format, lint, test,
build, browser, and Pages validation commands here and in `CONTRIBUTING.md`.

## Git And External Actions

- Use focused branches and conventional commit prefixes.
- Preserve unrelated user changes.
- Do not rewrite public history or force-push without explicit authorization.
- Creating issues, pull requests, comments, releases, Pages deployments, or
  other public actions requires the project owner's current authorization.
