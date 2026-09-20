import { StreamParser } from "n3";
import type { Quad } from "n3";
import type { BulkTriple, EntityContext } from "@trustgraph/react-provider";

type IriTerm = { t: "i"; i: string };
type LiteralTerm = { t: "l"; v: string; dt?: string; ln?: string };

function convertTerm(term: Quad["subject"] | Quad["predicate"] | Quad["object"]): IriTerm | LiteralTerm {
  if (term.termType === "Literal") {
    const result: LiteralTerm = { t: "l", v: term.value };
    if (term.language) result.ln = term.language;
    else if (term.datatype && term.datatype.value !== "http://www.w3.org/2001/XMLSchema#string") {
      result.dt = term.datatype.value;
    }
    return result;
  }
  return { t: "i", i: term.value };
}

function convertQuad(quad: Quad, graph?: string): BulkTriple {
  const triple: BulkTriple = {
    s: convertTerm(quad.subject) as IriTerm,
    p: convertTerm(quad.predicate) as IriTerm,
    o: convertTerm(quad.object),
  };
  if (graph) triple.g = { t: "i", i: graph };
  return triple;
}

async function* streamQuads(url: string): AsyncGenerator<Quad> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status}`);
  const body = response.body;
  if (!body) throw new Error(`No response body for ${url}`);

  const parser = new StreamParser();
  const buffer: Quad[] = [];
  let done = false;
  let error: Error | null = null;
  let waiting: (() => void) | null = null;

  parser.on("data", (quad: Quad) => {
    buffer.push(quad);
    if (waiting) { waiting(); waiting = null; }
  });
  parser.on("end", () => {
    done = true;
    if (waiting) { waiting(); waiting = null; }
  });
  parser.on("error", (e: Error) => {
    error = e;
    done = true;
    if (waiting) { waiting(); waiting = null; }
  });

  const reader = body.pipeThrough(new TextDecoderStream()).getReader();
  (async () => {
    try {
      for (;;) {
        const result = await reader.read();
        if (result.done) break;
        if (!parser.write(result.value)) {
          await new Promise<void>((r) => parser.once("drain", r));
        }
      }
      parser.end();
    } catch (e) {
      parser.destroy(e instanceof Error ? e : new Error(String(e)));
    }
  })();

  while (!done || buffer.length > 0) {
    if (buffer.length > 0) {
      yield buffer.shift()!;
    } else {
      await new Promise<void>((r) => { waiting = r; });
      if (error) throw error;
    }
  }
  if (error) throw error;
}

export async function* parseTurtleTriples(url: string, graph?: string): AsyncGenerator<BulkTriple> {
  for await (const quad of streamQuads(url)) {
    yield convertQuad(quad, graph);
  }
}

export async function* parseTurtleEntityContexts(url: string): AsyncGenerator<EntityContext> {
  for await (const quad of streamQuads(url)) {
    if (quad.object.termType === "Literal") {
      yield {
        entity: convertTerm(quad.subject) as IriTerm,
        context: quad.object.value,
      };
    }
  }
}
