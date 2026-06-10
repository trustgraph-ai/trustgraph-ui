import { useState, useEffect, useCallback } from "react";
import { useSocket } from "@trustgraph/react-provider";

/**
 * Generic hook to fetch and save a single config item.
 * Returns the parsed JSON value plus save helper.
 */
export function useConfigItem<T = any>(type: string, key: string | null) {
  const socket = useSocket();
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!key) {
      setData(null);
      return;
    }

    let cancelled = false;

    (async () => {
      setIsLoading(true);
      setError(null);

      try {
        const config = socket.config();
        const result = await config.getConfig([
          { type, key },
        ]) as any;

        if (cancelled) return;

        const values = result?.values || [];
        if (values.length > 0 && values[0]?.value) {
          setData(JSON.parse(values[0].value));
        } else {
          setData(null);
          setError("Item not found");
        }
        setIsLoading(false);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
          setIsLoading(false);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [type, key, socket]);

  const save = useCallback(async (updated: T): Promise<boolean> => {
    if (!key) return false;

    setIsSaving(true);
    setSaveError(null);

    try {
      const config = socket.config();
      await config.putConfig([
        { type, key, value: JSON.stringify(updated) },
      ]);
      setData(updated);
      setIsSaving(false);
      return true;
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : String(err));
      setIsSaving(false);
      return false;
    }
  }, [socket, type, key]);

  const remove = useCallback(async (): Promise<boolean> => {
    if (!key) return false;
    try {
      const config = socket.config();
      await config.deleteConfig({ type, key });
      setData(null);
      return true;
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : String(err));
      return false;
    }
  }, [socket, type, key]);

  return { data, isLoading, error, save, isSaving, saveError, remove };
}
