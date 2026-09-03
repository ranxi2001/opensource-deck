# Changelog

## [Unreleased]

### Fixed

- External replies on open Issues the user participated in now enter Needs
  action, and bounded browser refresh checks recent participating Issues rather
  than waiting for the next Pages sync.
- Recent Issue discovery now distinguishes an empty Assignee list from active
  implementation work by collecting and displaying bounded open linked-PR
  evidence with explicit unknown states.

## [0.1.1] - 2026-09-01

### Added

- Simplified Chinese is now the default README, with the English README kept as
  a linked alternative.
- Personal forks now derive the dashboard user and Pages base path from the
  repository context, so deployment requires no tracked-file changes.
- Browser refresh now preserves the deployed snapshot while updating
  current-head CI, review, comment, and merge state for priority authored or
  reviewed pull requests.
- Work items now use distinct, accessible decorators for item type, personal
  role, review decision, mergeability, and action state on desktop and mobile.

## [0.1.0] - 2026-08-30

OpenSourceDeck's first public release provides a read-only workspace for
tracking open-source contribution work across GitHub repositories.

### Added

- A responsive operational dashboard for issues, pull requests, reviews, CI
  results, contribution roles, and recent activity.
- Deterministic Needs action, Waiting upstream, Active, Completed, and Snoozed
  states with visible reason codes.
- Public account snapshots, bounded anonymous username lookup, and recent Issue
  discovery with repository and contribution-signal filters.
- A source-distributed `osdeck` CLI with human-readable and JSON output, plus a
  repository-owned Agent Skill for conservative contribution triage.
- An optional GitHub OAuth relay reference implementation with PKCE, exact
  origin checks, and encrypted HttpOnly sessions for runtime private access.
- Artifact-based GitHub Pages deployment, hourly public-data refresh, and
  credential checks for generated site output.
- OpenSourceDeck brand assets, favicon support, and a product-focused README.

### Security And Privacy

- GitHub access is read-only throughout v0.1.0.
- Static snapshots, CLI sync, and Agent Skill output remain public-only.
- Private GitHub tokens stay in the relay's encrypted HttpOnly cookie and are
  never returned to browser JavaScript or written to Pages artifacts.

[Unreleased]: https://github.com/ranxi2001/opensource-deck/compare/v0.1.1...HEAD
[0.1.1]: https://github.com/ranxi2001/opensource-deck/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/ranxi2001/opensource-deck/releases/tag/v0.1.0
