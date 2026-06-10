const configuredApiBaseUrl = (
  (import.meta as ImportMeta & { env?: { VITE_API_URL?: string } }).env
    ?.VITE_API_URL ?? ""
).trim();
const normalizedConfiguredBaseUrl = configuredApiBaseUrl.replace(/\/+$/, "");
const BASE_URL = normalizedConfiguredBaseUrl
  ? `${normalizedConfiguredBaseUrl}/api`
  : "/api";

export function apiUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const normalizedApiPath = normalizedPath.replace(/^\/api(\/|$)/, "/");

  return `${BASE_URL}${normalizedApiPath}`;
}