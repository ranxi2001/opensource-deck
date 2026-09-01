---
name: opensource-deck
description: Inspect and triage personal open-source contribution queues, review project activity, and scout recent public GitHub issues through the read-only OpenSourceDeck CLI. Use when a user or agent needs current cross-repository contribution state or candidates for a new contribution. Do not use it to mutate GitHub or to infer that an issue is unclaimed.
---

# OpenSourceDeck

Use the `osdeck` CLI as the structured interface to OpenSourceDeck data. Prefer
`--json` for reasoning and human output only when presenting a compact terminal
view.

## Resolve The CLI

Use `osdeck` when it is installed. Inside the OpenSourceDeck repository, use
`npm run cli -- <command>` if the binary is unavailable. Do not publish the npm
package, install the Skill globally, or change user configuration unless the
user asks.

The data source resolves in this order: `--source`, `OSDECK_SOURCE`, the local
public cache created by `sync`, then the official deployed public snapshot.
Always inspect `source`, `generatedAt`, `syncStatus`, and `warnings` before
making a time-sensitive claim.

## Workflows

Start with the smallest relevant query:

```bash
osdeck summary --json
osdeck work --state needs_action --json
osdeck work --project owner/repo --json
osdeck issues --signal contribution_label --json
osdeck issues --signal unassigned --project owner/repo --json
osdeck issues --signal linked_pull_request --json
osdeck show 'owner/repo#123' --json
osdeck url 'owner/repo#123'
```

Use `total` and `returned` to detect truncation. Increase `--limit` only as far
as the task needs. Use `--query` and `--project` before loading broad lists.

Run `osdeck sync --user <login> --json` when the user asks for a fresh public
view. An optional `GITHUB_TOKEN` or `GH_TOKEN` improves public rate limits and
enrichment, but the CLI never includes private repositories and never prints
the token. Private repository data remains in the OAuth browser workflow.

## Contribution Decisions

Treat OpenSourceDeck state as navigation evidence, not authority:

- `needs_action` and `waiting_upstream` are deterministic dashboard states;
  report their reason codes and source facts when the distinction matters.
- `unassigned`, `linked_pull_request`, `good_first_issue`, and `help_wanted` are
  public screening signals. `unassigned` means only that the Assignee list is
  empty. Check `linkedPullRequestStatus` before treating an empty
  `linkedPullRequests` array as evidence that no open PR was found. None of
  these signals proves that a pull request will be accepted.
- Before recommending or starting a candidate, inspect the live GitHub Issue,
  current assignees, recent comments, linked or overlapping pull requests, and
  repository contribution instructions.
- Keep exact `owner/repo#number` identity in notes and commands.

The CLI is read-only. A comment, assignment, branch push, issue edit, review,
or pull request requires the user's separate authorization and the target
repository's contribution process. Draft proposed text and evidence first when
an external action is requested.
