import { useState, useEffect, useCallback } from "react";
import { useSocket } from "@trustgraph/react-provider";

/**
 * Generic hook to list keys for a given config type.
 * Returns the array of keys plus reload + create + delete helpers.
 */
export function useConfigItems(type: string) {
  const socket = useSocket();
  const [keys, setKeys] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const config = socket.config();
      // The list method returns { directory: ["key1", "key2", ...] }
      const result = await (config as any).list(type) as { directory?: string[] };
      const items = result?.directory || [];
      setKeys([...items].sort());
      setIsLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setIsLoading(false);
    }
  }, [socket, type]);

  useEffect(() => {
    load();
  }, [load]);

  const create = useCallback(async (key: string, value: object): Promise<boolean> => {
    try {
      const config = socket.config();
      await config.putConfig([
        { type, key, value: JSON.stringify(value) },
      ]);
      await load();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return false;
    }
  }, [socket, type, load]);

  const remove = useCallback(async (key: string): Promise<boolean> => {
    try {
      const config = socket.config();
      await config.deleteConfig({ type, key });
      await load();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return false;
    }
  }, [socket, type, load]);

  return { keys, isLoading, error, reload: load, create, remove };
}
