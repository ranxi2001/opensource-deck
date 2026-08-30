import { dashboardDataSchema, type DashboardData } from "../domain/schema";

export async function loadDashboardData(
  signal?: AbortSignal,
): Promise<DashboardData> {
  const configured = import.meta.env.VITE_DATA_FILE || "data/dashboard.json";
  const path = `${import.meta.env.BASE_URL}${configured.replace(/^\//, "")}`;
  const response = await fetch(path, { signal, cache: "no-store" });
  if (!response.ok)
    throw new Error(`仪表盘数据请求失败，HTTP 状态码：${response.status}`);
  return dashboardDataSchema.parse(await response.json());
}
