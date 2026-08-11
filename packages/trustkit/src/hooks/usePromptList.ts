import { useState, useEffect, useCallback } from "react";
import { useSocket } from "@trustgraph/react-provider";

export interface PromptListItem {
  id: string;
  label: string;
  isSystem: boolean;
}

export function usePromptList() {
  const socket = useSocket();
  const [prompts, setPrompts] = useState<PromptListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const config = socket.config();

      const result = await (config as any).list("prompt") as { directory?: string[] };
      const keys = result?.directory || [];
      const templateIds = keys
        .filter((k: string) => k.startsWith("template."))
        .map((k: string) => k.slice("template.".length));

      const items: PromptListItem[] = [
        { id: "system", label: "System Prompt", isSystem: true },
        ...templateIds.map((id: string) => ({
          id: `template.${id}`,
          label: id.replace(/-/g, " "),
          isSystem: false,
        })),
      ];

      setPrompts(items);
      setIsLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setIsLoading(false);
    }
  }, [socket]);

  useEffect(() => {
    load();
  }, [load]);

  const create = useCallback(async (name: string): Promise<string | null> => {
    try {
      const config = socket.config();
      const id = name.trim().toLowerCase().replace(/\s+/g, "-");
      const key = `template.${id}`;

      await config.putConfig([
        {
          type: "prompt",
          key,
          value: JSON.stringify({
            prompt: "",
            "response-type": "text",
          }),
        },
      ]);

      await load();

      return key;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return null;
    }
  }, [socket, load]);

  return { prompts, isLoading, error, reload: load, create };
}
