import { useState, useCallback, useRef } from "react";
import { useSocket } from "@trustgraph/react-provider";

export interface PromptTestResult {
  response: string;
  isStreaming: boolean;
  isComplete: boolean;
  error: string | null;
  inTokens?: number;
  outTokens?: number;
  model?: string;
}

export function usePromptTest() {
  const socket = useSocket();
  const [result, setResult] = useState<PromptTestResult>({
    response: "",
    isStreaming: false,
    isComplete: false,
    error: null,
  });
  const abortRef = useRef(false);

  const run = useCallback((promptId: string, variables: Record<string, unknown>) => {
    abortRef.current = false;

    setResult({
      response: "",
      isStreaming: true,
      isComplete: false,
      error: null,
    });

    // Strip the "template." prefix if present — promptStreaming expects just the ID
    const id = promptId.startsWith("template.") ? promptId.slice(9) : promptId;

    const api = socket.flow("default");
    api.promptStreaming(
      id,
      variables,
      (chunk: string, complete: boolean, metadata?: { in_token?: number; out_token?: number; model?: string }) => {
        if (abortRef.current) return;

        setResult(prev => ({
          ...prev,
          response: prev.response + chunk,
          isStreaming: !complete,
          isComplete: complete,
          inTokens: metadata?.in_token,
          outTokens: metadata?.out_token,
          model: metadata?.model as string | undefined,
        }));
      },
      (error: string) => {
        if (abortRef.current) return;
        setResult(prev => ({
          ...prev,
          isStreaming: false,
          isComplete: true,
          error,
        }));
      },
    );
  }, [socket]);

  const abort = useCallback(() => {
    abortRef.current = true;
    setResult(prev => ({
      ...prev,
      isStreaming: false,
      isComplete: true,
    }));
  }, []);

  const reset = useCallback(() => {
    abortRef.current = true;
    setResult({
      response: "",
      isStreaming: false,
      isComplete: false,
      error: null,
    });
  }, []);

  return { result, run, abort, reset };
}
