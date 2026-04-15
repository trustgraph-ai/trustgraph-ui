import { v4 as uuidv4 } from "uuid";

import { Triple } from "@trustgraph/client";

export const RDF_TYPE = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";
export const RDFS_LABEL = "http://www.w3.org/2000/01/rdf-schema#label";
export const DIGITAL_DOCUMENT = "https://schema.org/DigitalDocument";
export const SCHEMA_URL = "https://schema.org/url";
export const SCHEMA_KEYWORDS = "https://schema.org/keywords";

export interface DocumentParameters {
  title?: string;
  url?: string;
  keywords?: string[];
  comments?: string;
}

export const createDocId = () => {
  return "https://trustgraph.ai/doc/" + uuidv4();
};

export const prepareMetadata = (doc_id: string, params: DocumentParameters) => {
  let doc_meta: Triple[] = [
    {
      s: { t: "i", i: doc_id },
      p: { t: "i", i: RDF_TYPE },
      o: { t: "i", i: DIGITAL_DOCUMENT },
    },
  ];

  if (params.title != "")
    doc_meta = [
      ...doc_meta,
      {
        s: { t: "i", i: doc_id },
        p: { t: "i", i: RDFS_LABEL },
        o: { t: "l", v: params.title ?? "" },
      },
    ];

  if (params.url != "")
    doc_meta = [
      ...doc_meta,
      {
        s: { t: "i", i: doc_id },
        p: { t: "i", i: SCHEMA_URL },
        o: { t: "i", i: params.url ?? "" },
      },
    ];

  for (const keyword of params.keywords ?? [])
    doc_meta = [
      ...doc_meta,
      {
        s: { t: "i", i: doc_id },
        p: { t: "i", i: SCHEMA_KEYWORDS },
        o: { t: "l", v: keyword },
      },
    ];

  return doc_meta;
};
