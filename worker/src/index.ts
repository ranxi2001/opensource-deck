import { collectDashboard } from "../../scripts/lib/collector";
import { GitHubClient } from "../../scripts/lib/github";
import type { DeckConfig } from "../../src/domain/schema";

export interface Env {
  ALLOWED_ORIGINS: string;
  AUTH_BASE_URL: string;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  PUBLIC_APP_URL: string;
  SESSION_SECRET: string;
}

interface PendingAuth {
  state: string;
  verifier: string;
  returnTo: string;
  expiresAt: number;
}

interface PrivateSession {
  accessToken: string;
  login: string;
  expiresAt: number;
}

interface TokenResponse {
  access_token?: string;
  expires_in?: number;
  refresh_token?: string;
  error?: string;
  error_description?: string;
}

interface AuthenticatedUser {
  login: string;
}

const pendingCookie = "osd_oauth";
const sessionCookie = "osd_session";
const encoder = new TextEncoder();
const decoder = new TextDecoder();

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value
    .replaceAll("-", "+")
    .replaceAll("_", "/")
    .padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function encryptionKey(secret: string): Promise<CryptoKey> {
  if (secret.length < 32)
    throw new Error("SESSION_SECRET must contain at least 32 characters");
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(secret));
  return crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);
}

export async function encryptPayload(
  value: unknown,
  secret: string,
): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = encoder.encode(JSON.stringify(value));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    await encryptionKey(secret),
    plaintext,
  );
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  return base64Url(combined);
}

export async function decryptPayload<T>(
  value: string,
  secret: string,
): Promise<T> {
  const combined = fromBase64Url(value);
  if (combined.length <= 12) throw new Error("Encrypted session is malformed");
  const iv = combined.slice(0, 12);
  const encrypted = combined.slice(12);
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    await encryptionKey(secret),
    encrypted,
  );
  return JSON.parse(decoder.decode(plaintext)) as T;
}

function randomValue(bytes = 32): string {
  return base64Url(crypto.getRandomValues(new Uint8Array(bytes)));
}

async function codeChallenge(verifier: string): Promise<string> {
  return base64Url(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", encoder.encode(verifier)),
    ),
  );
}

function allowedOrigins(env: Env): string[] {
  return env.ALLOWED_ORIGINS.split(",")
    .map((origin) => origin.trim().replace(/\/$/, ""))
    .filter(Boolean);
}

export function isAllowedReturnTo(
  value: string,
  env: Pick<Env, "ALLOWED_ORIGINS">,
): boolean {
  try {
    const target = new URL(value);
    return allowedOrigins(env as Env).includes(target.origin);
  } catch {
    return false;
  }
}

function requestOrigin(request: Request, env: Env): string | null {
  const origin = request.headers.get("Origin");
  return origin && allowedOrigins(env).includes(origin.replace(/\/$/, ""))
    ? origin
    : null;
}

function cookieValue(request: Request, name: string): string | null {
  const cookie = request.headers.get("Cookie") ?? "";
  for (const part of cookie.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return rest.join("=");
  }
  return null;
}

function setCookie(name: string, value: string, maxAge: number): string {
  return `${name}=${value}; Max-Age=${maxAge}; Path=/; HttpOnly; Secure; SameSite=None`;
}

function clearCookie(name: string): string {
  return `${name}=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=None`;
}

function secureHeaders(headers = new Headers()): Headers {
  headers.set("Cache-Control", "no-store, private");
  headers.set(
    "Content-Security-Policy",
    "default-src 'none'; frame-ancestors 'none'",
  );
  headers.set("Referrer-Policy", "no-referrer");
  headers.set("X-Content-Type-Options", "nosniff");
  return headers;
}

function corsHeaders(request: Request, env: Env): Headers | null {
  const origin = requestOrigin(request, env);
  if (!origin) return null;
  const headers = secureHeaders();
  headers.set("Access-Control-Allow-Origin", origin);
  headers.set("Access-Control-Allow-Credentials", "true");
  headers.set("Access-Control-Allow-Headers", "Accept, Content-Type");
  headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  headers.set("Vary", "Origin");
  return headers;
}

function json(
  request: Request,
  env: Env,
  value: unknown,
  status = 200,
): Response {
  const headers = corsHeaders(request, env) ?? secureHeaders();
  headers.set("Content-Type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(value), { status, headers });
}

function configurationMissing(env: Env): string[] {
  return [
    ["AUTH_BASE_URL", env.AUTH_BASE_URL],
    ["GITHUB_CLIENT_ID", env.GITHUB_CLIENT_ID],
    ["GITHUB_CLIENT_SECRET", env.GITHUB_CLIENT_SECRET],
    ["SESSION_SECRET", env.SESSION_SECRET],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);
}

async function login(request: Request, env: Env): Promise<Response> {
  const missing = configurationMissing(env);
  if (missing.length > 0)
    return new Response(`OAuth relay is missing ${missing.join(", ")}`, {
      status: 503,
    });
  const url = new URL(request.url);
  const returnTo = url.searchParams.get("return_to") ?? env.PUBLIC_APP_URL;
  if (!isAllowedReturnTo(returnTo, env))
    return new Response("return_to origin is not allowed", { status: 400 });
  const state = randomValue();
  const verifier = randomValue(48);
  const pending: PendingAuth = {
    state,
    verifier,
    returnTo,
    expiresAt: Date.now() + 10 * 60_000,
  };
  const authorize = new URL("https://github.com/login/oauth/authorize");
  authorize.searchParams.set("client_id", env.GITHUB_CLIENT_ID);
  authorize.searchParams.set(
    "redirect_uri",
    `${env.AUTH_BASE_URL.replace(/\/$/, "")}/auth/callback`,
  );
  authorize.searchParams.set("scope", "repo read:user");
  authorize.searchParams.set("state", state);
  authorize.searchParams.set("code_challenge", await codeChallenge(verifier));
  authorize.searchParams.set("code_challenge_method", "S256");
  const headers = secureHeaders(
    new Headers({ Location: authorize.toString() }),
  );
  headers.append(
    "Set-Cookie",
    setCookie(
      pendingCookie,
      await encryptPayload(pending, env.SESSION_SECRET),
      600,
    ),
  );
  return new Response(null, { status: 302, headers });
}

async function callback(request: Request, env: Env): Promise<Response> {
  const pendingRaw = cookieValue(request, pendingCookie);
  if (!pendingRaw)
    return new Response("OAuth transaction cookie is missing", { status: 400 });
  let pending: PendingAuth;
  try {
    pending = await decryptPayload<PendingAuth>(pendingRaw, env.SESSION_SECRET);
  } catch {
    return new Response("OAuth transaction cookie is invalid", { status: 400 });
  }
  const url = new URL(request.url);
  const state = url.searchParams.get("state");
  const code = url.searchParams.get("code");
  if (!state || state !== pending.state || pending.expiresAt < Date.now()) {
    return new Response("OAuth state is invalid or expired", { status: 400 });
  }
  if (!code) return new Response("OAuth code is missing", { status: 400 });

  const tokenResponse = await fetch(
    "https://github.com/login/oauth/access_token",
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code,
        code_verifier: pending.verifier,
        redirect_uri: `${env.AUTH_BASE_URL.replace(/\/$/, "")}/auth/callback`,
      }),
    },
  );
  const token = (await tokenResponse.json()) as TokenResponse;
  if (!tokenResponse.ok || !token.access_token) {
    return new Response(
      token.error_description ?? token.error ?? "OAuth token exchange failed",
      {
        status: 502,
      },
    );
  }
  const client = new GitHubClient({ token: token.access_token });
  const user = await client.get<AuthenticatedUser>("/user");
  const maxAge = Math.min(token.expires_in ?? 8 * 60 * 60, 8 * 60 * 60);
  const session: PrivateSession = {
    accessToken: token.access_token,
    login: user.login,
    expiresAt: Date.now() + maxAge * 1000,
  };
  const target = new URL(pending.returnTo);
  target.searchParams.set("auth", "connected");
  const headers = secureHeaders(new Headers({ Location: target.toString() }));
  headers.append(
    "Set-Cookie",
    setCookie(
      sessionCookie,
      await encryptPayload(session, env.SESSION_SECRET),
      maxAge,
    ),
  );
  headers.append("Set-Cookie", clearCookie(pendingCookie));
  return new Response(null, { status: 302, headers });
}

async function privateSession(
  request: Request,
  env: Env,
): Promise<PrivateSession | null> {
  const raw = cookieValue(request, sessionCookie);
  if (!raw) return null;
  try {
    const session = await decryptPayload<PrivateSession>(
      raw,
      env.SESSION_SECRET,
    );
    return session.expiresAt > Date.now() ? session : null;
  } catch {
    return null;
  }
}

async function dashboard(request: Request, env: Env): Promise<Response> {
  if (!requestOrigin(request, env))
    return json(request, env, { error: "Origin is not allowed" }, 403);
  const session = await privateSession(request, env);
  if (!session)
    return json(request, env, { error: "Authentication required" }, 401);
  const config: DeckConfig = {
    schemaVersion: 1,
    githubUser: session.login,
    lookbackDays: 90,
    completedRetentionDays: 30,
    projects: {},
    exclude: { repositories: [], labels: [] },
    overrides: {},
  };
  try {
    const result = await collectDashboard({
      client: new GitHubClient({ token: session.accessToken }),
      config,
      includePrivate: true,
      concurrency: 6,
    });
    return json(request, env, result);
  } catch (error) {
    return json(
      request,
      env,
      {
        error:
          error instanceof Error
            ? error.message
            : "Private dashboard collection failed",
      },
      502,
    );
  }
}

async function sessionInfo(request: Request, env: Env): Promise<Response> {
  if (!requestOrigin(request, env))
    return json(request, env, { error: "Origin is not allowed" }, 403);
  const session = await privateSession(request, env);
  return session
    ? json(request, env, {
        authenticated: true,
        login: session.login,
        accessMode: "private",
      })
    : json(request, env, { authenticated: false }, 401);
}

function logout(request: Request, env: Env): Response {
  if (!requestOrigin(request, env))
    return json(request, env, { error: "Origin is not allowed" }, 403);
  const response = json(request, env, { ok: true });
  response.headers.append("Set-Cookie", clearCookie(sessionCookie));
  return response;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") {
      const headers = corsHeaders(request, env);
      return headers
        ? new Response(null, { status: 204, headers })
        : new Response(null, { status: 403 });
    }
    if (request.method === "GET" && url.pathname === "/auth/login")
      return login(request, env);
    if (request.method === "GET" && url.pathname === "/auth/callback")
      return callback(request, env);
    if (request.method === "GET" && url.pathname === "/api/dashboard")
      return dashboard(request, env);
    if (request.method === "GET" && url.pathname === "/api/session")
      return sessionInfo(request, env);
    if (request.method === "POST" && url.pathname === "/auth/logout")
      return logout(request, env);
    if (request.method === "GET" && url.pathname === "/health") {
      return new Response("ok", {
        headers: secureHeaders(new Headers({ "Content-Type": "text/plain" })),
      });
    }
    return new Response("Not found", { status: 404, headers: secureHeaders() });
  },
} satisfies ExportedHandler<Env>;
