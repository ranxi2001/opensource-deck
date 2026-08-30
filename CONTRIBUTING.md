# Contributing To OpenSourceDeck

OpenSourceDeck has a working v0.1 implementation. Contributions should preserve
the product, data, and security contracts in `docs/PRD.md`.

## Before Starting

1. Read `README.md`, `docs/PRD.md`, and `AGENTS.md`.
2. Search open issues and pull requests for overlapping work.
3. For a substantial feature or a change to the product contract, open an issue
   and align on scope before implementation.

## Change Scope

- Keep one coherent problem per pull request.
- Add tests with implementation changes.
- Update the PRD when changing scope, state semantics, generated data, security,
  or acceptance criteria.
- Changes to OAuth, cookies, origin policy, private-data flow, or GitHub
  permissions require an explicit security design and regression tests.
- Do not add GitHub mutations as an incidental feature.
- Do not commit credentials, tokens, generated API dumps, or private activity.

## Commit Style

Use conventional prefixes such as:

- `docs:` documentation only;
- `feat:` new product behavior;
- `fix:` correctness repair;
- `refactor:` behavior-preserving structure;
- `test:` test-only change;
- `ci:` workflow and automation change;
- `chore:` repository maintenance.

## Validation

Run:

```bash
npm run check
npm run test:e2e
```

Install Playwright's Chromium dependencies first when needed. State any skipped
live GitHub, OAuth, browser, Worker, or Pages validation explicitly.

## Pull Requests

Explain:

- the user or maintainer problem;
- the behavior or contract that changes;
- tests and validation actually run;
- security, privacy, compatibility, and deployment impact;
- skipped checks and residual risk.

All contributors are responsible for understanding and reviewing every line
they submit, including AI-assisted changes.
