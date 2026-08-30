# OpenSourceDeck Agent Instructions

## Purpose

OpenSourceDeck is a public, owner-maintained project for a personal open-source
contribution dashboard. The v0.1 implementation includes a static public mode
and an optional OAuth relay for runtime private-repository access.

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
- Static snapshots process and publish public GitHub data only.
- Private data is returned only at runtime to an authenticated browser and must
  never enter generated JSON, logs, screenshots, or Pages artifacts.
- GitHub tokens must remain inside the relay's encrypted HttpOnly cookie and
  must never enter browser JavaScript.
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
- Keep public username lookup anonymous, bounded, and visibly degraded when
  enrichment is unavailable.
- Keep OAuth code exchange, token access, and private collection server-side.
- Require exact origin allowlists and encrypted, expiring sessions.
- Prefer established libraries for parsing, schemas, accessibility, and test
  tooling rather than ad hoc implementations.

## Documentation Changes

Update `docs/PRD.md` when a change alters product scope, state classification,
data contracts, security boundaries, or acceptance criteria. Update `README.md`
when public status, setup, or delivered capability changes.

Do not describe planned PRD behavior as implemented.

## Validation

Required static checks:

```bash
npm run check
```

Required browser checks for user-facing changes:

```bash
npx playwright install --with-deps chromium
npm run test:e2e
```

Use `npm run sync -- --output public/data/live.json` for public live-data
validation. The output is ignored and must not be committed. Use the
`browse-with-cdp` workflow for final desktop/mobile screenshots when available.

The optional relay must pass `npm run worker:check`; never deploy it with
placeholder OAuth or session secrets.

## Git And External Actions

- Use focused branches and conventional commit prefixes.
- Preserve unrelated user changes.
- Do not rewrite public history or force-push without explicit authorization.
- Creating issues, pull requests, comments, releases, Pages deployments, or
  other public actions requires the project owner's current authorization.
