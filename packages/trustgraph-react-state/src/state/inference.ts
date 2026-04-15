import { useMutation } from "@tanstack/react-query";
import { useSocket } from "@trustgraph/react-provider";
import { useSessionStore } from "./session";
import type { EntityMatch, ExplainEvent } from "@trustgraph/client";

export interface GraphRagOptions {
  entityLimit?: number;
  tripleLimit?: number;
  maxSubgraphSize?: number;
  pathLength?: number;
}

export interface GraphRagResult {
  response: string;
  entities: EntityMatch[];
  explainEvents?: ExplainEvent[];
}

export interface GraphRagCallbacks {
  onChunk?: (chunk: string, complete: boolean) => void;
  onExplain?: (event: ExplainEvent) => void;
  onError?: (error: string) => void;
}

export interface TextCompletionCallbacks {
  onChunk?: (chunk: string, complete: boolean) => void;
  onError?: (error: string) => void;
}

export interface AgentCallbacks {
  onThink?: (thought: string, complete: boolean, messageId?: string) => void;
  onObserve?: (observation: string, complete: boolean, messageId?: string) => void;
  onAnswer?: (answer: string, complete: boolean, messageId?: string) => void;
  onExplain?: (event: ExplainEvent) => void;
  onError?: (error: string) => void;
}

export interface DocumentRagCallbacks {
  onChunk?: (chunk: string, complete: boolean) => void;
  onExplain?: (event: ExplainEvent) => void;
  onError?: (error: string) => void;
}

export interface DocumentRagResult {
  response: string;
  explainEvents?: ExplainEvent[];
}

/**
 * Hook providing low-level access to LLM inference services
 * No conversation state or side effects - just the API calls
 */
export const useInference = ({ flow }: { flow?: string } = {}) => {
  const socket = useSocket();
  const sessionFlowId = useSessionStore((state) => state.flowId);

  // Use explicit param if provided, otherwise fall back to session state
  const effectiveFlow = flow ?? sessionFlowId;

  /**
   * Graph RAG inference with entity discovery and optional explainability
   * Explainability events are only tracked if callbacks.onExplain is provided
   */
  const graphRagMutation = useMutation({
    mutationFn: async ({
      input,
      options,
      collection,
      callbacks,
    }: {
      input: string;
      options?: GraphRagOptions;
      collection: string;
      callbacks?: GraphRagCallbacks;
    }): Promise<GraphRagResult> => {
      // Only collect explain events if caller provided onExplain callback
      const wantsExplainability = !!callbacks?.onExplain;
      const explainEvents: ExplainEvent[] | undefined = wantsExplainability ? [] : undefined;

      // If callbacks provided, use streaming API
      const response = callbacks
        ? await new Promise<string>((resolve, reject) => {
            let accumulated = "";

            const onChunk = (chunk: string, complete: boolean) => {
              accumulated += chunk;
              callbacks?.onChunk?.(chunk, complete);
              if (complete) {
                resolve(accumulated);
              }
            };

            const onError = (error: string) => {
              callbacks?.onError?.(error);
              reject(new Error(error));
            };

            // Only wire up onExplain if caller wants explainability
            const onExplain = wantsExplainability
              ? (event: ExplainEvent) => {
                  explainEvents!.push(event);
                  callbacks.onExplain!(event);
                }
              : undefined;

            socket
              .flow(effectiveFlow)
              .graphRagStreaming(input, onChunk, onError, options, collection, onExplain);
          })
        : await socket.flow(effectiveFlow).graphRag(input, options || {}, collection);

      // Get embeddings for entity discovery
      const allEmbeddings = await socket.flow(effectiveFlow).embeddings([input]);
      const embeddings = allEmbeddings[0];

      // Query graph embeddings to find entities
      const entities = await socket
        .flow(effectiveFlow)
        .graphEmbeddingsQuery(
          embeddings,
          options?.entityLimit || 10,
          collection
        );

      return { response, entities, explainEvents };
    },
  });

  /**
   * Basic LLM text completion
   */
  const textCompletionMutation = useMutation({
    mutationFn: async ({
      systemPrompt,
      input,
      callbacks,
    }: {
      systemPrompt: string;
      input: string;
      callbacks?: TextCompletionCallbacks;
    }): Promise<string> => {
      // If callbacks provided, use streaming API
      return callbacks
        ? await new Promise<string>((resolve, reject) => {
            let accumulated = "";

            const onChunk = (chunk: string, complete: boolean) => {
              accumulated += chunk;
              callbacks?.onChunk?.(chunk, complete);
              if (complete) {
                resolve(accumulated);
              }
            };

            const onError = (error: string) => {
              callbacks?.onError?.(error);
              reject(new Error(error));
            };

            socket
              .flow(effectiveFlow)
              .textCompletionStreaming(systemPrompt, input, onChunk, onError);
          })
        : await socket.flow(effectiveFlow).textCompletion(systemPrompt, input);
    },
  });

  /**
   * Document RAG inference with optional explainability
   */
  const documentRagMutation = useMutation({
    mutationFn: async ({
      input,
      collection,
      docLimit,
      callbacks,
    }: {
      input: string;
      collection: string;
      docLimit?: number;
      callbacks?: DocumentRagCallbacks;
    }): Promise<DocumentRagResult> => {
      const wantsExplainability = !!callbacks?.onExplain;
      const explainEvents: ExplainEvent[] | undefined = wantsExplainability ? [] : undefined;

      const response = await new Promise<string>((resolve, reject) => {
        let accumulated = "";

        const onChunk = (chunk: string, complete: boolean) => {
          accumulated += chunk;
          callbacks?.onChunk?.(chunk, complete);
          if (complete) {
            resolve(accumulated);
          }
        };

        const onError = (error: string) => {
          callbacks?.onError?.(error);
          reject(new Error(error));
        };

        const onExplain = wantsExplainability
          ? (event: ExplainEvent) => {
              explainEvents!.push(event);
              callbacks.onExplain!(event);
            }
          : undefined;

        socket
          .flow(effectiveFlow)
          .documentRagStreaming(input, onChunk, onError, docLimit, collection, onExplain);
      });

      return { response, explainEvents };
    },
  });

  /**
   * Agent inference with streaming callbacks and optional explainability
   */
  const agentMutation = useMutation({
    mutationFn: async ({
      input,
      collection,
      callbacks,
    }: {
      input: string;
      collection?: string;
      callbacks?: AgentCallbacks;
    }): Promise<string> => {
      const wantsExplainability = !!callbacks?.onExplain;
      const explainEvents: ExplainEvent[] | undefined = wantsExplainability ? [] : undefined;

      return new Promise<string>((resolve, reject) => {
        let fullAnswer = "";

        const onThink = (thought: string, complete: boolean, messageId?: string) => {
          callbacks?.onThink?.(thought, complete, messageId);
        };

        const onObserve = (observation: string, complete: boolean, messageId?: string) => {
          callbacks?.onObserve?.(observation, complete, messageId);
        };

        const onAnswer = (answer: string, complete: boolean, messageId?: string) => {
          fullAnswer += answer;
          callbacks?.onAnswer?.(answer, complete, messageId);
          if (complete) {
            resolve(fullAnswer);
          }
        };

        const onError = (error: string) => {
          callbacks?.onError?.(error);
          reject(new Error(error));
        };

        const onExplain = wantsExplainability
          ? (event: ExplainEvent) => {
              explainEvents!.push(event);
              callbacks.onExplain!(event);
            }
          : undefined;

        socket
          .flow(effectiveFlow)
          .agent(input, onThink, onObserve, onAnswer, onError, onExplain, collection);
      });
    },
  });

  return {
    graphRag: graphRagMutation.mutateAsync,
    documentRag: documentRagMutation.mutateAsync,
    textCompletion: textCompletionMutation.mutateAsync,
    agent: agentMutation.mutateAsync,
    isLoading:
      graphRagMutation.isPending ||
      documentRagMutation.isPending ||
      textCompletionMutation.isPending ||
      agentMutation.isPending,
  };
};
