import { useQuery } from "@tanstack/react-query";
import type { Triple, Term } from "@trustgraph/client";

import { useSocket, useConnectionState } from "@trustgraph/react-provider";
import { useNotification } from "../hooks/useNotification";
import { useActivity } from "../hooks/useActivity";
import { useSettings } from "./settings";
import { useSessionStore } from "./session";

export const useTriples = ({ flow, s, p, o, limit, collection }: {
  flow?: string;
  s?: Term;
  p?: Term;
  o?: Term;
  limit: number;
  collection?: string;
}): {
  triples: Triple[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
} => {
  const socket = useSocket();
  const notify = useNotification();
  const { settings } = useSettings();
  const connectionState = useConnectionState();
  const isSocketReady = connectionState?.status === "authenticated";
  const sessionFlowId = useSessionStore((state) => state.flowId);
  const effectiveFlow = flow ?? sessionFlowId;
  const effectiveCollection = collection || settings.collection;

  const query = useQuery({
    queryKey: ["triples", { flow: effectiveFlow, s, p, o, limit, collection: effectiveCollection }],
    enabled: isSocketReady,
    queryFn: () => {
      return socket
        .flow(effectiveFlow)
        .triplesQuery(s, p, o, limit, effectiveCollection)
        .catch((err: unknown) => {
          const message = err instanceof Error ? err.message : String(err);
          notify.error(message);
          throw err;
        });
    },
  });

  useActivity(query.isLoading, "Loading triples");

  return {
    triples: (query.data ?? []) as Triple[],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
};
