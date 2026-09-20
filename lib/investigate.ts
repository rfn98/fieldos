import { queryMoss } from "./moss";
import { completeChat } from "./llm";
import { PipeError, type Evidence, type InvestigateResult } from "./types";

export interface InvestigateInput {
  question?: unknown;
}

const TOP_K = 5;

function normalizeQuestion(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim();
}

function buildUserPrompt(question: string, retrieved: { id: string; type: string; assetId: string; score: number; text: string }[]): string {
  const lines: string[] = ["QUESTION", question, ""];

  if (retrieved.length === 0) {
    lines.push("RETRIEVED EVIDENCE: none");
  } else {
    lines.push(`RETRIEVED EVIDENCE (${retrieved.length} document${retrieved.length === 1 ? "" : "s"}):`);
    for (const doc of retrieved) {
      lines.push("");
      lines.push(`--- ${doc.type.toUpperCase()} ${doc.id} | asset: ${doc.assetId} | score: ${doc.score.toFixed(4)} ---`);
      lines.push(doc.text);
    }
  }

  return lines.join("\n");
}

const SYSTEM_PROMPT = [
  "You are FieldOS, an AI copilot for field technicians working in plants.",
  "You are given a question and retrieved evidence from the plant's maintenance knowledge base.",
  "Answer the question using ONLY the retrieved evidence.",
  "Do not invent operational facts such as readings, root causes, part numbers, or procedures.",
  "If the evidence is insufficient to answer, say so explicitly and state what additional data would help.",
  "Cite the evidence documents you rely on by their IDs.",
  "Be concise and technically practical.",
  "Format: letter or bullets, no preamble.",
].join("\n");

export async function investigate(input: InvestigateInput): Promise<InvestigateResult> {
  const question = normalizeQuestion(input.question);
  if (question.length === 0) {
    throw new PipeError("invalid_request", 400, "question must be a non-empty string.");
  }

  const startedAt = performance.now();

  console.time("[investigate] moss");
  const retrieval = await queryMoss(question, TOP_K);
  console.timeEnd("[investigate] moss");

  const evidence: Evidence[] = retrieval.docs.map((doc) => {
    const metadata = doc.metadata;
    return {
      id: doc.id,
      type: metadata.type ?? "unknown",
      assetId: metadata.asset_id ?? "unknown",
      plantId: metadata.plantId,
      severity: metadata.severity,
      category: metadata.category,
      date: metadata.date,
      score: doc.score,
      snippet: doc.text.slice(0, 140),
    };
  });

  console.time("[investigate] llm");
  const llm = await completeChat({
    system: SYSTEM_PROMPT,
    user: buildUserPrompt(
      question,
      retrieval.docs.map((doc) => ({
        id: doc.id,
        type: doc.metadata.type ?? "unknown",
        assetId: doc.metadata.asset_id ?? "unknown",
        score: doc.score,
        text: doc.text,
      }))
    ),
  });
  console.timeEnd("[investigate] llm");

  console.log(
    `[investigate] total: ${Math.round(performance.now() - startedAt)}ms`
  );

  return {
    answer: llm.content,
    evidence,
    retrieval: {
      provider: "moss",
      indexName: retrieval.indexName,
      latencyMs: retrieval.latencyMs,
      documents: evidence.length,
      query: question,
    },
    model: llm.model,
    latency: {
      llmMs: llm.latencyMs,
      totalMs: Math.round(performance.now() - startedAt),
    },
  };
}