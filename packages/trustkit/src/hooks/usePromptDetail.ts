import { useState, useEffect, useCallback } from "react";
import { useSocket } from "@trustgraph/react-provider";

export interface PromptData {
  prompt: string;
  responseType: "text" | "json" | "jsonl";
  schema?: object;
  objectSchema?: object;
}

export function usePromptDetail(promptId: string | null) {
  const socket = useSocket();
  const [data, setData] = useState<PromptData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Fetch prompt content
  useEffect(() => {
    if (!promptId) {
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
          { type: "prompt", key: promptId },
        ]) as any;

        if (cancelled) return;

        const values = result?.values || [];
        if (values.length > 0 && values[0]?.value) {
          const raw = JSON.parse(values[0].value);
          setData({
            prompt: raw.prompt || "",
            responseType: raw["response-type"] || "text",
            schema: raw.schema,
            objectSchema: raw["object-schema"],
          });
        } else {
          setData(null);
          setError("Prompt not found");
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
  }, [promptId, socket]);

  // Save prompt
  const save = useCallback(async (updated: PromptData) => {
    if (!promptId) return;

    setIsSaving(true);
    setSaveError(null);

    try {
      const config = socket.config();

      // Build the config value in the format TrustGraph expects
      const value: Record<string, unknown> = {
        prompt: updated.prompt,
        "response-type": updated.responseType,
      };
      if (updated.responseType === "json" && updated.schema) {
        value.schema = updated.schema;
      }
      if (updated.responseType === "jsonl" && updated.objectSchema) {
        value["object-schema"] = updated.objectSchema;
      }

      await config.putConfig([
        { type: "prompt", key: promptId, value: JSON.stringify(value) },
      ]);

      setData(updated);
      setIsSaving(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : String(err));
      setIsSaving(false);
    }
  }, [promptId, socket]);

  return { data, isLoading, error, save, isSaving, saveError };
}
