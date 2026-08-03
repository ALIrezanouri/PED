import type { ElasticityResult } from "./types";

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:4000";

export async function analyzeCsv(file: File): Promise<ElasticityResult> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_BASE}/api/analyze`, { method: "POST", body: form });
  if (!res.ok) {
    let msg = `خطای سرور (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) msg = body.error;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  return (await res.json()) as ElasticityResult;
}

export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/health`, { cache: "no-store" });
    return res.ok;
  } catch {
    return false;
  }
}
