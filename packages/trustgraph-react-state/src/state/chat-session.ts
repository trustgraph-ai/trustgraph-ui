import { useMutation } from "@tanstack/react-query";
import { useRef, useCallback } from "react";
import { useNotification } from "../hooks/useNotification";
import { useActivity } from "../hooks/useActivity";
import { useConversation } from "./conversation";
import { useInference } from "./inference";
import { useWorkbenchStateStore } from "./workbench";
import { useProgressStateStore } from "./progress";
import { useSettings } from "./settings";
import { RDFS_LABEL, getTermValue } from "../utils/knowledge-graph";
import { Entity } from "../model/entity";
import { useSocket } from "@trustgraph/react-provider";
import { useSessionStore } from "./session";
import { useExplainabilityStore } from "./explainability-store";
import { useExplainability } from "./explainability";
import type { Triple } from "@trustgraph/client";

/**
 * High-level hook for managing chat sessions
 * Combines conversation state with inference services
 * Handles routing, progress tracking, entity management, and notifications
 */
export const useChatSession = ({ flow }: { flow?: string } = {}) => {
  const socket = useSocket();
  const notify = useNotification();

  // Conversation state
  const addMessage = useConversation((state) => state.addMessage);
  const updateLastMessage = useConversation((state) => state.updateLastMessage);
  const setInput = useConversation((state) => state.setInput);
  const chatMode = useConversation((state) => state.chatMode);

  // Progress and activity management
  const addActivity = useProgressStateStore((state) => state.addActivity);
  const removeActivity = useProgressStateStore(
    (state) => state.removeActivity
  );

  // Session and workbench state
  const sessionFlowId = useSessionStore((state) => state.flowId);
  const setEntities = useWorkbenchStateStore((state) => state.setEntities);

  // Use explicit param if provided, otherwise fall back to session state
  const effectiveFlow = flow ?? sessionFlowId;

  // Settings for GraphRAG configuration
  const { settings } = useSettings();

  // Explainability store for persisting sessions
  const addExplainSession = useExplainabilityStore((state) => state.addSession);

  // Track the current explain session ID so onUpdate can target the right store key
  const explainSessionIdRef = useRef<string | undefined>(undefined);

  // Explainability hook — onUpdate syncs every state change to the Zustand store
  const explainability = useExplainability({
    flow: effectiveFlow,
    collection: settings.collection,
    onUpdate: (session) => {
      const id = explainSessionIdRef.current;
      if (id) {
        addExplainSession(id, session);
      }
    },
  });
  const explainabilityRef = useRef(explainability);
  explainabilityRef.current = explainability;

  // Generate unique session IDs
  const generateSessionId = useCallback(() => {
    return `explain-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Inference services
  const inference = useInference({ flow });

  /**
   * Graph RAG chat handling with entity discovery
   */
  const handleGraphRag = async (input: string) => {
    const ragActivity = "Graph RAG: " + input;
    const embActivity = "Find entities: " + input;

    addActivity(ragActivity);

    let accumulated = "";
    let messageAdded = false;

    const sessionId = generateSessionId();
    explainabilityRef.current.reset();
    explainSessionIdRef.current = sessionId;

    try {
      // Execute Graph RAG with streaming and entity discovery
      const result = await inference.graphRag({
        input,
        options: {
          entityLimit: settings.graphrag.entityLimit,
          tripleLimit: settings.graphrag.tripleLimit,
          maxSubgraphSize: settings.graphrag.maxSubgraphSize,
          pathLength: settings.graphrag.pathLength,
        },
        collection: settings.collection,
        callbacks: {
          onChunk: (chunk, complete) => {
            accumulated += chunk;

            if (!messageAdded) {
              addMessage("ai", accumulated, undefined, sessionId);
              messageAdded = true;
            } else {
              updateLastMessage(accumulated);
            }
          },
          onExplain: (event) => {
            console.log("[explain] event received:", event.explainId);
            explainabilityRef.current.addEvent(event);
          },
        },
      });

      removeActivity(ragActivity);

      // Start embeddings activity
      addActivity(embActivity);

      // Get labels for each entity
      const labelPromises = result.entities
        .filter((match) => match.entity !== null)
        .map(async (match) => {
        const entity = match.entity!;
        const labelActivity = "Label " + getTermValue(entity);
        addActivity(labelActivity);

        try {
          const triples = await socket
            .flow(effectiveFlow)
            .triplesQuery(
              entity,
              { t: "i", i: RDFS_LABEL },
              undefined,
              1,
              settings.collection
            );
          removeActivity(labelActivity);
          return triples;
        } catch (err) {
          removeActivity(labelActivity);
          throw err;
        }
      });

      const labelResponses = await Promise.all(labelPromises);

      // Convert graph labels to entity list
      const entityList: Entity[] = labelResponses
        .filter((resp) => resp && resp.length > 0)
        .map((resp: Triple[]) => ({
          label: getTermValue(resp[0].o),
          uri: getTermValue(resp[0].s),
        }));

      setEntities(entityList);
      removeActivity(embActivity);

      return result.response;
    } catch (error) {
      removeActivity(ragActivity);
      removeActivity(embActivity);
      throw error;
    }
  };

  /**
   * Basic LLM chat handling
   */
  const handleBasicLlm = async (input: string) => {
    const activity = "Text completion: " + input;
    addActivity(activity);

    let accumulated = "";
    let messageAdded = false;

    try {
      const response = await inference.textCompletion({
        systemPrompt:
          "You are a helpful assistant. Provide clear and concise responses.",
        input,
        callbacks: {
          onChunk: (chunk, complete) => {
            accumulated += chunk;

            if (!messageAdded) {
              // Add empty message on first chunk
              addMessage("ai", accumulated);
              messageAdded = true;
            } else {
              // Update existing message with accumulated text
              updateLastMessage(accumulated);
            }
          },
        },
      });

      removeActivity(activity);
      setEntities([]);

      return response;
    } catch (error) {
      removeActivity(activity);
      throw error;
    }
  };

  /**
   * Agent chat handling with streaming responses
   */
  const handleAgent = async (input: string) => {
    const activity = "Agent: " + input;
    addActivity(activity);

    let thinkingAccumulated = "";
    let thinkingMessageAdded = false;
    let observationAccumulated = "";
    let observationMessageAdded = false;
    let answerAccumulated = "";
    let answerMessageAdded = false;

    const sessionId = generateSessionId();
    explainabilityRef.current.reset();
    explainSessionIdRef.current = sessionId;

    try {
      const response = await inference.agent({
        input,
        collection: settings.collection,
        callbacks: {
          onThink: (thought, complete) => {
            thinkingAccumulated += thought;
            if (!thinkingMessageAdded) {
              addMessage("ai", thinkingAccumulated, "thinking");
              thinkingMessageAdded = true;
            } else {
              updateLastMessage(thinkingAccumulated);
            }
            if (complete) {
              thinkingAccumulated = "";
              thinkingMessageAdded = false;
            }
          },
          onObserve: (observation, complete) => {
            observationAccumulated += observation;
            if (!observationMessageAdded) {
              addMessage("ai", observationAccumulated, "observation");
              observationMessageAdded = true;
            } else {
              updateLastMessage(observationAccumulated);
            }
            if (complete) {
              observationAccumulated = "";
              observationMessageAdded = false;
            }
          },
          onAnswer: (answer, complete) => {
            answerAccumulated += answer;
            if (!answerMessageAdded) {
              addMessage("ai", answerAccumulated, "answer", sessionId);
              answerMessageAdded = true;
            } else {
              updateLastMessage(answerAccumulated);
            }
          },
          onExplain: (event) => {
            console.log("[explain] agent event received:", event.explainId);
            explainabilityRef.current.addEvent(event);
          },
        },
      });

      removeActivity(activity);
      setEntities([]);

      return response;
    } catch (error) {
      removeActivity(activity);
      throw error;
    }
  };

  /**
   * Main chat mutation handling message submission
   */
  const chatMutation = useMutation({
    mutationFn: async ({ input }: { input: string }) => {
      // Add user message immediately
      addMessage("human", input);

      try {
        let response: string;

        // Route to appropriate handler based on chat mode
        switch (chatMode) {
          case "graph-rag":
            response = await handleGraphRag(input);
            break;
          case "basic-llm":
            response = await handleBasicLlm(input);
            break;
          case "agent":
            response = await handleAgent(input);
            break;
          default:
            throw new Error("Unknown chat mode");
        }

        // Clear input after successful submission
        setInput("");
        return response;
      } catch (error) {
        // Add error message to chat
        const errorMessage =
          error instanceof Error
            ? error.message
            : error?.toString() || "Unknown error";
        addMessage("ai", errorMessage);

        // Clear input even on error
        setInput("");
        throw error;
      }
    },
    onError: (err) => {
      console.log("Chat error:", err);
      notify.error(err.toString());
    },
  });

  // Show loading indicator for chat operations
  useActivity(chatMutation.isPending, "Processing chat message");

  return {
    submitMessage: chatMutation.mutate,
    isSubmitting: chatMutation.isPending,
    submitError: chatMutation.error,
  };
};

// Re-export as useChat for convenience
export const useChat = useChatSession;
