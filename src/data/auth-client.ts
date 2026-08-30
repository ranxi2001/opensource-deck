import { dashboardDataSchema, type DashboardData } from "../domain/schema";

function authBase(): string | null {
  const configured = import.meta.env.VITE_AUTH_API_URL?.trim();
  return configured ? configured.replace(/\/$/, "") : null;
}

export function authIsConfigured(): boolean {
  return authBase() !== null;
}

export function beginGitHubLogin(): void {
  const base = authBase();
  if (!base)
    throw new Error("Private access is not configured for this deployment.");
  const login = new URL(`${base}/auth/login`);
  login.searchParams.set(
    "return_to",
    window.location.href.split("?")[0] ?? window.location.href,
  );
  window.location.assign(login);
}

export async function loadPrivateDashboard(
  signal?: AbortSignal,
): Promise<DashboardData> {
  const base = authBase();
  if (!base)
    throw new Error("Private access is not configured for this deployment.");
  const response = await fetch(`${base}/api/dashboard`, {
    credentials: "include",
    headers: { Accept: "application/json" },
    signal,
  });
  if (response.status === 401)
    throw new Error("Your GitHub session has expired. Connect again.");
  if (!response.ok)
    throw new Error(
      `Private dashboard request failed with HTTP ${response.status}`,
    );
  return dashboardDataSchema.parse(await response.json());
}

export async function logoutPrivateSession(): Promise<void> {
  const base = authBase();
  if (!base) return;
  const response = await fetch(`${base}/auth/logout`, {
    method: "POST",
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  if (!response.ok)
    throw new Error(`Logout failed with HTTP ${response.status}`);
}
