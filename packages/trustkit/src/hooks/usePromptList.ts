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

      // Fetch the template index to get all template IDs
      const result = await config.getConfig([
        { type: "prompt", key: "template-index" },
      ]) as any;

      // Parse response — template-index is a JSON array of IDs
      const values = result?.values || [];
      let templateIds: string[] = [];

      if (values.length > 0 && values[0]?.value) {
        try {
          templateIds = JSON.parse(values[0].value);
        } catch {
          templateIds = [];
        }
      }

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

  // Create a new prompt template
  const create = useCallback(async (name: string): Promise<string | null> => {
    try {
      const config = socket.config();
      const id = name.trim().toLowerCase().replace(/\s+/g, "-");
      const key = `template.${id}`;

      // Create the prompt with empty template
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

      // Update template-index to include the new ID
      const indexResult = await config.getConfig([
        { type: "prompt", key: "template-index" },
      ]) as any;

      let templateIds: string[] = [];
      const values = indexResult?.values || [];
      if (values.length > 0 && values[0]?.value) {
        try { templateIds = JSON.parse(values[0].value); } catch { /* empty */ }
      }

      if (!templateIds.includes(id)) {
        templateIds.push(id);
        await config.putConfig([
          { type: "prompt", key: "template-index", value: JSON.stringify(templateIds) },
        ]);
      }

      // Reload the list
      await load();

      return key;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return null;
    }
  }, [socket, load]);

  return { prompts, isLoading, error, reload: load, create };
}
