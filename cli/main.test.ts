import path from "node:path";
import { describe, expect, it } from "vitest";
import sampleData from "../public/data/dashboard.json";
import { runCli, type CliRuntime } from "./main";
import { formatTable, terminalText } from "./output";

const root = path.resolve(import.meta.dirname, "..");
const sample = path.join(root, "public/data/dashboard.json");

function capture(overrides: Partial<CliRuntime> = {}) {
  let stdout = "";
  let stderr = "";
  return {
    runtime: {
      cwd: root,
      home: root,
      env: {},
      stdout: (text: string) => {
        stdout += text;
      },
      stderr: (text: string) => {
        stderr += text;
      },
      ...overrides,
    },
    stdout: () => stdout,
    stderr: () => stderr,
  };
}

describe("OpenSourceDeck CLI", () => {
  it("emits a stable JSON summary envelope", async () => {
    const output = capture();
    const code = await runCli(
      ["summary", "--source", sample, "--json"],
      output.runtime,
    );
    const result = JSON.parse(output.stdout()) as Record<string, unknown>;
    expect(code).toBe(0);
    expect(result).toMatchObject({
      source: sample,
      accessMode: "public",
      user: "ranxi2001",
      projects: 5,
      items: 9,
      recentIssues: 4,
    });
    expect(output.stderr()).toBe("");
  });

  it("filters contribution work for agent consumption", async () => {
    const output = capture();
    const code = await runCli(
      ["work", "--source", sample, "--state", "needs_action", "--json"],
      output.runtime,
    );
    const result = JSON.parse(output.stdout()) as {
      total: number;
      returned: number;
      items: Array<{ state: string }>;
    };
    expect(code).toBe(0);
    expect(result.total).toBeGreaterThan(0);
    expect(result.returned).toBe(result.items.length);
    expect(result.items.every((item) => item.state === "needs_action")).toBe(
      true,
    );
  });

  it("filters exact issue signals and resolves a candidate URL", async () => {
    const issuesOutput = capture();
    expect(
      await runCli(
        [
          "issues",
          "--source",
          sample,
          "--signal",
          "good_first_issue",
          "--json",
        ],
        issuesOutput.runtime,
      ),
    ).toBe(0);
    const result = JSON.parse(issuesOutput.stdout()) as {
      issues: Array<{
        repository: string;
        number: number;
        signals: string[];
      }>;
    };
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0]?.signals).toContain("good_first_issue");

    const linkedOutput = capture();
    expect(
      await runCli(
        [
          "issues",
          "--source",
          sample,
          "--signal",
          "linked_pull_request",
          "--json",
        ],
        linkedOutput.runtime,
      ),
    ).toBe(0);
    const linkedResult = JSON.parse(linkedOutput.stdout()) as {
      issues: Array<{ number: number; linkedPullRequests: unknown[] }>;
    };
    expect(linkedResult.issues).toEqual([
      expect.objectContaining({ number: 5101 }),
    ]);
    expect(linkedResult.issues[0]?.linkedPullRequests).toHaveLength(1);

    const urlOutput = capture();
    expect(
      await runCli(
        ["url", "kvcache-ai/AgentENV#241", "--source", sample],
        urlOutput.runtime,
      ),
    ).toBe(0);
    expect(urlOutput.stdout().trim()).toBe(
      "https://github.com/kvcache-ai/AgentENV/issues/241",
    );
  });

  it("rejects private export options without exposing environment tokens", async () => {
    const output = capture({ env: { GITHUB_TOKEN: "not-printed" } });
    expect(
      await runCli(
        ["sync", "--user", "octocat", "--include-private"],
        output.runtime,
      ),
    ).toBe(1);
    expect(output.stderr()).toContain("include-private");
    expect(output.stderr()).not.toContain("not-printed");
  });

  it("refuses private dashboard sources before rendering them", async () => {
    const output = capture({
      fetcher: async () =>
        new Response(
          JSON.stringify({
            ...sampleData,
            accessMode: "private",
            projects: sampleData.projects.map((project, index) => ({
              ...project,
              visibility: index === 0 ? "private" : project.visibility,
            })),
          }),
          { headers: { "Content-Type": "application/json" } },
        ),
    });
    expect(
      await runCli(
        ["summary", "--source", "https://private.example/dashboard.json"],
        output.runtime,
      ),
    ).toBe(1);
    expect(output.stdout()).toBe("");
    expect(output.stderr()).toContain("拒绝读取私有 dashboard 数据");
  });
});

describe("terminal output", () => {
  it("removes control sequences from untrusted text", () => {
    expect(terminalText("safe\u001b[31m\nnext")).toBe("safe [31m next");
    const table = formatTable(
      [{ title: "a\u0007b" }],
      [{ header: "标题", value: (row) => row.title }],
    );
    expect(table).toContain("a b");
    expect(
      [...table.replaceAll("\n", "")].every((character) => {
        const code = character.charCodeAt(0);
        return code > 31 && (code < 127 || code > 159);
      }),
    ).toBe(true);
  });
});
