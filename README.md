# OpenSourceDeck

OpenSourceDeck is a personal command center for open-source contributions. It
turns GitHub issues, pull requests, reviews, and CI results into one navigable,
action-oriented workspace.

> Status: v0.1 public mode is live at
> [onefly.top/opensource-deck](https://onefly.top/opensource-deck/). Private
> access requires a separately configured OAuth relay and is not enabled on the
> public deployment.

![OpenSourceDeck desktop dashboard](docs/assets/dashboard-desktop.png)

## What It Does

- Discovers contribution work from GitHub account activity instead of a manual
  repository list.
- Uses Chinese as the default interface language.
- Finds open issues updated in the last 30 days across recently active projects,
  with repository, keyword, assignment, and contribution-label filters.
- Groups work by full `owner/name` repository identity.
- Separates Needs action, Waiting upstream, Active, Completed, and Snoozed work.
- Explains every state with deterministic source facts and reason codes.
- Surfaces failing and pending CI, requested reviews, requested changes, merge
  conflicts, labels, roles, and recent activity.
- Provides responsive project navigation, filters, details, quick links,
  themes, and keyboard command search.

## Access Modes

### Public Username

Enter any GitHub username in the account panel. The browser performs a limited,
anonymous, read-only lookup of recent public activity. The live view is capped
at 20 recently active repositories and omits per-item CI, review, and comment
enrichment to stay within anonymous API limits.

Recent-issue discovery scans the first 8 of those repositories. Authenticated
collection scans up to 20 repositories. Candidates use only public signals such
as assignees, `good first issue`, and `help wanted`. An unassigned issue is not
guaranteed to be unclaimed; check its discussion and contribution policy before
starting work.

The deployed snapshot for the repository owner is generated hourly by GitHub
Actions with the repository-scoped `GITHUB_TOKEN`. It contains public data only.

### GitHub Login And Private Repositories

The optional relay under `worker/` implements GitHub OAuth with PKCE, server-side
code exchange, exact origin checks, and an AES-GCM encrypted HttpOnly session
cookie. The GitHub token is never returned to the frontend or written to the
Pages artifact.

Private mode requires a GitHub OAuth App and a deployed relay. See
[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md). Same-site custom domains are
recommended because browsers can block cross-site session cookies.

## Local Development

Requirements: Node.js 24 or newer.

```bash
npm ci
npm run dev
```

The default development view uses committed public sample data. To collect a
current public snapshot without committing it:

```bash
GITHUB_TOKEN="$(gh auth token)" npm run sync -- --output public/data/live.json
VITE_DATA_FILE=data/live.json npm run dev
```

Do not use a token with private repository access for a static Pages snapshot.

## Validation

```bash
npm run check
npx playwright install --with-deps chromium
npm run test:e2e
```

`npm run check` covers formatting, lint, TypeScript, unit/component/security
tests, production build, and a Cloudflare Worker dry-run. Playwright covers
desktop and mobile interactions, Axe accessibility checks, and horizontal
overflow.

## Repository Map

| Path                   | Purpose                                                     |
| ---------------------- | ----------------------------------------------------------- |
| `src/domain/`          | Versioned schemas, classification, aggregation, and filters |
| `scripts/`             | GitHub collection and atomic snapshot generation            |
| `src/components/`      | Operational dashboard and account access interface          |
| `worker/`              | Optional OAuth relay for private repository mode            |
| `e2e/`                 | Playwright and reusable CDP browser validation              |
| `.github/workflows/`   | CI plus public snapshot and Pages deployment                |
| `docs/PRD.md`          | Product requirements and acceptance contract                |
| `docs/ARCHITECTURE.md` | Runtime, data, auth, and trust boundaries                   |
| `docs/DEPLOYMENT.md`   | Pages and optional OAuth relay setup                        |

## Product Principles

- Read-only: OpenSourceDeck never mutates upstream GitHub state.
- Explainable: deterministic reason codes, not opaque scores.
- Public artifact: private repository data never enters static build output.
- Secure sessions: private tokens stay inside the relay's encrypted HttpOnly
  cookie.
- Dashboard first: the application opens on the working view, not a marketing
  page.

## Prior Art

OpenSourceDeck is informed by
[PersonalDashboard](https://github.com/roshkhatri/PersonalDashboard),
[gh-dash](https://github.com/dlvhdr/gh-dash), and
[Octobox](https://github.com/octobox/octobox). It is an independent
implementation and does not include their source code.

## Contributing And Security

Read [CONTRIBUTING.md](CONTRIBUTING.md) before proposing a change. Do not open a
public issue for a vulnerability or private-data exposure; follow
[SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE)
