export interface RateLimitSnapshot {
  remaining: number | null;
  resetAt: string | null;
}

export interface GitHubClientOptions {
  token?: string;
  fetcher?: typeof fetch;
  apiBase?: string;
}

export class GitHubRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly path: string,
  ) {
    super(message);
    this.name = "GitHubRequestError";
  }
}

export class GitHubClient {
  private readonly token?: string;
  private readonly fetcher: typeof fetch;
  private readonly apiBase: string;
  private rateLimit: RateLimitSnapshot = { remaining: null, resetAt: null };

  constructor(options: GitHubClientOptions = {}) {
    this.token = options.token;
    this.fetcher =
      options.fetcher ??
      ((input: RequestInfo | URL, init?: RequestInit) =>
        globalThis.fetch(input, init));
    this.apiBase = (options.apiBase ?? "https://api.github.com").replace(
      /\/$/,
      "",
    );
  }

  getRateLimit(): RateLimitSnapshot {
    return { ...this.rateLimit };
  }

  async get<T>(
    path: string,
    params: Record<string, string | number | undefined> = {},
  ): Promise<T> {
    const url = new URL(path.replace(/^\//, ""), `${this.apiBase}/`);
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "OpenSourceDeck/0.1",
    };
    if (this.token) headers.Authorization = `Bearer ${this.token}`;

    const response = await this.fetcher(url, { method: "GET", headers });
    this.captureRateLimit(response.headers);
    if (!response.ok) {
      throw new GitHubRequestError(
        `GitHub GET ${url.pathname} failed with HTTP ${response.status}`,
        response.status,
        url.pathname,
      );
    }
    return (await response.json()) as T;
  }

  private captureRateLimit(headers: Headers): void {
    const remaining = headers.get("x-ratelimit-remaining");
    const reset = headers.get("x-ratelimit-reset");
    this.rateLimit = {
      remaining:
        remaining === null
          ? this.rateLimit.remaining
          : Number.parseInt(remaining, 10),
      resetAt:
        reset === null
          ? this.rateLimit.resetAt
          : new Date(Number.parseInt(reset, 10) * 1000).toISOString(),
    };
  }
}

export async function mapLimit<T, R>(
  values: T[],
  concurrency: number,
  mapper: (value: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(values.length);
  let cursor = 0;
  async function worker(): Promise<void> {
    while (cursor < values.length) {
      const index = cursor++;
      results[index] = await mapper(values[index] as T, index);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, values.length) }, () =>
      worker(),
    ),
  );
  return results;
}
