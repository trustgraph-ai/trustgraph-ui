let cachedVersion: string | null | undefined;

async function getVersion(): Promise<string | null> {
  if (cachedVersion !== undefined) return cachedVersion;
  try {
    const resp = await fetch("/config/version.json");
    if (!resp.ok) { cachedVersion = null; return null; }
    const data = await resp.json();
    cachedVersion = (data.version as string) ?? null;
  } catch {
    cachedVersion = null;
  }
  return cachedVersion;
}

export async function getDatasetHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    "X-Timezone": Intl.DateTimeFormat().resolvedOptions().timeZone,
    "X-Language": navigator.language,
  };
  const version = await getVersion();
  if (version) headers["X-Version"] = version;
  return headers;
}
