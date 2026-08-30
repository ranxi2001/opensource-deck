# Security Policy

## Supported Versions

OpenSourceDeck has not published a production release. Security fixes currently
target the default branch.

## Reporting A Vulnerability

Do not open a public issue for a vulnerability or privacy exposure. Use the
repository's private security advisory channel when available. If that channel
is unavailable, contact the repository owner through the GitHub profile without
including exploit details in a public thread.

Include:

- the affected commit or deployed version;
- the security or privacy boundary involved;
- minimal reproduction steps;
- observed and expected behavior;
- impact and any known exposure;
- a proposed mitigation when available.

Never include real credentials, private repository metadata, customer data, or
other secrets in a report.

## Security Boundaries

The v0.1 design requires:

- public GitHub data only;
- read-only GitHub API behavior;
- no token in client code, generated JSON, logs, or Pages artifacts;
- untrusted rendering for all GitHub-provided text;
- minimal explicit workflow permissions;
- no client analytics by default.

A change that weakens one of these boundaries requires an explicit security
design review before implementation.
