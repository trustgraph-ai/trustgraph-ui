// @ts-nocheck
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";

import { useSocket, useConnectionState } from "@trustgraph/react-provider";
import { useNotification } from "../hooks/useNotification";
import { useActivity } from "../hooks/useActivity";
import {
  normalizeJsonLd,
  denormalizeToJsonLd,
} from "../utils/jsonld-ontology";
import type { NormalizedOntology } from "../utils/jsonld-ontology";

export type {
  NormalizedOntology,
  OntologyMetadata,
  OntologyClass,
  OntologyProperty,
  LangString,
  JsonLdNode,
} from "../utils/jsonld-ontology";

export {
  normalizeJsonLd,
  denormalizeToJsonLd,
  createEmptyOntology,
  getLocalName,
  getNamespace,
  getLabel,
} from "../utils/jsonld-ontology";

export const useOntologies = () => {
  const socket = useSocket();
  const connectionState = useConnectionState();
  const queryClient = useQueryClient();
  const notify = useNotification();

  const isSocketReady =
    connectionState?.status === "authenticated";

  const ontologiesQuery = useQuery({
    queryKey: ["ontologies"],
    enabled: isSocketReady,
    queryFn: () => {
      return socket
        .config()
        .getValues("ontology")
        .then((values) => {
          return values.map(
            (item): [string, NormalizedOntology] => [
              item.key,
              normalizeJsonLd(JSON.parse(item.value)),
            ],
          );
        })
        .catch((err) => {
          console.log("Error:", err);
          throw err;
        });
    },
  });

  const updateOntologyMutation = useMutation({
    mutationFn: ({
      id,
      ontology,
      onSuccess,
    }: {
      id: string;
      ontology: NormalizedOntology;
      onSuccess?: () => void;
    }) => {
      return socket
        .config()
        .putConfig([
          {
            type: "ontology",
            key: id,
            value: JSON.stringify(denormalizeToJsonLd(ontology)),
          },
        ])
        .then((x) => {
          if (x["error"]) {
            console.log("Error:", x);
            throw x.error.message;
          }
          if (onSuccess) onSuccess();
        });
    },
    onError: (err) => {
      console.log("Error:", err);
      notify.error(err.toString());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ontologies"] });
      notify.success("Ontology updated");
    },
  });

  const createOntologyMutation = useMutation({
    mutationFn: ({
      id,
      ontology,
      onSuccess,
    }: {
      id: string;
      ontology: NormalizedOntology;
      onSuccess?: () => void;
    }) => {
      return socket
        .config()
        .putConfig([
          {
            type: "ontology",
            key: id,
            value: JSON.stringify(denormalizeToJsonLd(ontology)),
          },
        ])
        .then((x) => {
          if (x["error"]) {
            console.log("Error:", x);
            throw x.error.message;
          }
          if (onSuccess) onSuccess();
        });
    },
    onError: (err) => {
      console.log("Error:", err);
      notify.error(err.toString());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ontologies"] });
      notify.success("Ontology created");
    },
  });

  const deleteOntologyMutation = useMutation({
    mutationFn: ({
      id,
      onSuccess,
    }: {
      id: string;
      onSuccess?: () => void;
    }) => {
      return socket
        .config()
        .deleteConfig([
          {
            type: "ontology",
            key: id,
          },
        ])
        .then((x) => {
          if (x["error"]) {
            console.log("Error:", x);
            throw x.error.message;
          }
          if (onSuccess) onSuccess();
        });
    },
    onError: (err) => {
      console.log("Error:", err);
      notify.error(err.toString());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ontologies"] });
      notify.success("Ontology deleted");
    },
  });

  useActivity(ontologiesQuery.isLoading, "Loading ontologies");
  useActivity(updateOntologyMutation.isPending, "Updating ontology");
  useActivity(createOntologyMutation.isPending, "Creating ontology");
  useActivity(deleteOntologyMutation.isPending, "Deleting ontology");

  return {
    ontologies: ontologiesQuery.data || [],
    ontologiesLoading: ontologiesQuery.isLoading,
    ontologiesError: ontologiesQuery.error,

    updateOntology: updateOntologyMutation.mutate,
    isUpdatingOntology: updateOntologyMutation.isPending,

    createOntology: createOntologyMutation.mutate,
    isCreatingOntology: createOntologyMutation.isPending,

    deleteOntology: deleteOntologyMutation.mutate,
    isDeletingOntology: deleteOntologyMutation.isPending,

    refetch: () => {
      ontologiesQuery.refetch();
    },
  };
};
