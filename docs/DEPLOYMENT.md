# Deploying OpenSourceDeck

## Public GitHub Pages Mode

The canonical public deployment is
[https://onefly.top/opensource-deck/](https://onefly.top/opensource-deck/).

The recommended personal setup does not require any project-file changes. The
workflow uses the fork owner as the dashboard user and derives the Pages base
path from the repository name:

1. Fork the repository.
2. Enable the fork's workflows from the **Actions** tab if GitHub asks you to
   do so.
3. In **Settings → Pages**, select **GitHub Actions** as the source.
4. Run `Sync and deploy Pages` from the **Actions** tab for the first deployment.
5. Open `https://<your-user>.github.io/<repository-name>/`, or
   `https://<your-user>.github.io/` when the repository itself is named
   `<your-user>.github.io`.

The workflow collects public data with the repository-scoped `GITHUB_TOKEN`,
runs validation, and uploads `dist/` as a Pages artifact. Generated account data
is not committed.

For a fork owned by an organization, set the repository Actions variable
`OSDECK_GITHUB_USER` to the personal GitHub username the dashboard should show.
This setting is optional for personal forks and does not modify tracked files.

The Pages site also supports anonymous public username lookup. Anonymous mode
has lower API limits and intentionally omits detailed enrichment.

## Private Repository Mode

Private mode requires a GitHub OAuth App and a relay deployment. GitHub Pages
remains public; private data must never be added to its build artifact.

### Domain Requirement

Use same-site custom domains when private mode must work across modern browser
privacy settings, for example:

```text
https://deck.example.com       Pages frontend
https://auth.deck.example.com  OAuth relay
```

The default `github.io` and `workers.dev` domains are cross-site. Even with
`SameSite=None`, browsers may block the relay session as a third-party cookie.

### GitHub OAuth App

Create an OAuth App with:

- Homepage URL: the frontend URL.
- Callback URL: `https://AUTH_HOST/auth/callback`.
- Expiring tokens enabled.
- Device flow disabled.

The relay requests `repo read:user`. This is broad private-repository access;
users must review the OAuth authorization before accepting. A future GitHub App
adapter can provide repository-selection permissions.

### Cloudflare Worker Reference Adapter

Install and authenticate Wrangler, then configure the non-secret values in
`worker/wrangler.jsonc`. For local development, copy
`worker/.dev.vars.example` to `worker/.dev.vars` and replace every placeholder.

Set production secrets without printing them:

```bash
npx wrangler secret put GITHUB_CLIENT_ID --config worker/wrangler.jsonc
npx wrangler secret put GITHUB_CLIENT_SECRET --config worker/wrangler.jsonc
npx wrangler secret put SESSION_SECRET --config worker/wrangler.jsonc
```

Set `AUTH_BASE_URL` as a Worker variable or secret, then deploy:

```bash
npm run worker:check
npx wrangler deploy --config worker/wrangler.jsonc
```

Set the repository Actions variable `AUTH_API_URL` to the relay origin and run
the Pages workflow again. The frontend enables Connect GitHub only when
`VITE_AUTH_API_URL` is present at build time.

### Local Relay

```bash
npm run worker:dev
VITE_AUTH_API_URL=http://localhost:8787 npm run dev
```

The OAuth App callback must match the local relay URL. Never commit
`worker/.dev.vars`, tokens, client secrets, or session secrets.

## Verification

```bash
npm run check
npm run test:e2e
```

After deployment, verify the exact Pages and relay origins, current data
freshness, public username lookup, login redirect, session expiry, logout,
private repository visibility, and absence of private data from `dist/`.
