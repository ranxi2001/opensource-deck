# OpenSourceDeck

OpenSourceDeck is a personal command center for open-source contributions. It
turns recent GitHub issues, pull requests, reviews, and CI results into one
navigable, action-oriented workspace.

> Project status: bootstrap. The product requirements are defined, but the
> dashboard application is not implemented yet.

## Why

Contributors often participate in many repositories without owning any of
them. GitHub exposes the underlying work, but it remains split across issue,
pull request, review, notification, and repository pages. OpenSourceDeck aims
to answer three questions from one page:

1. What needs my attention now?
2. What is waiting on an upstream maintainer or contributor?
3. Which projects have I worked on recently, and where should I navigate next?

## Planned v0.1

- Discover public GitHub work from recent account activity.
- Group issues and pull requests by repository.
- Classify work into Needs action, Waiting upstream, Active, and Completed.
- Surface CI failures, review requests, requested changes, and stale work.
- Provide keyboard-friendly links to repositories, issues, pull requests, and
  workflow runs.
- Refresh through GitHub Actions and deploy as a static GitHub Pages site.
- Keep all credentials out of the browser and generated public data.

The complete product contract is in [docs/PRD.md](docs/PRD.md).

## Product Principles

- Read-only first: v0.1 never mutates upstream repositories.
- Explain every classification: deterministic reason codes, not opaque scores.
- Public data only: a public Pages artifact must never contain private work.
- Useful before configurable: account activity discovers projects; configuration
  only pins, hides, or annotates them.
- Dashboard first: the application opens on the working view, not a marketing
  landing page.

## Prior Art

OpenSourceDeck is informed by projects such as
[PersonalDashboard](https://github.com/roshkhatri/PersonalDashboard),
[gh-dash](https://github.com/dlvhdr/gh-dash), and
[Octobox](https://github.com/octobox/octobox). No third-party source code is
included in this bootstrap commit.

## Contributing

The project is currently turning the PRD into an implementation plan. Read
[CONTRIBUTING.md](CONTRIBUTING.md) before proposing a change.

## Security

OpenSourceDeck will process public GitHub metadata through scheduled workflows.
Review [SECURITY.md](SECURITY.md) before reporting a security or privacy issue.

## License

[MIT](LICENSE)
