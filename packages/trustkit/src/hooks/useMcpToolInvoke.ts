import { useState, useCallback } from "react";
import { useSocket } from "@trustgraph/react-provider";

export interface McpInvokeResult {
  response: unknown;
  error: string | null;
  isInvoking: boolean;
}

/**
 * Invokes an MCP tool via the mcp-tool service.
 * The MCP tool key in config-svc is the remote name passed as `name`.
 */
export function useMcpToolInvoke() {
  const socket = useSocket();
  const [result, setResult] = useState<McpInvokeResult>({
    response: null,
    error: null,
    isInvoking: false,
  });

  const invoke = useCallback(async (name: string, parameters: Record<string, unknown>) => {
    setResult({ response: null, error: null, isInvoking: true });

    try {
      const response = await (socket as any).makeRequest(
        "mcp-tool",
        { name, parameters },
        30000,
        undefined,
        "default",
      );
      setResult({ response, error: null, isInvoking: false });
    } catch (err) {
      setResult({
        response: null,
        error: err instanceof Error ? err.message : String(err),
        isInvoking: false,
      });
    }
  }, [socket]);

  const reset = useCallback(() => {
    setResult({ response: null, error: null, isInvoking: false });
  }, []);

  return { ...result, invoke, reset };
}
