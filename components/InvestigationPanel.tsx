"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { InvestigateResult, InvestigationPhase } from "@/lib/types";

const ERROR_TEXT: Record<string, string> = {
  network: "Could not reach the FieldOS API.",
  invalid_request: "The investigation request was rejected. Enter a non-empty question.",
  moss_config: "Knowledge retrieval is not available right now. Please try again.",
  moss_retrieval: "Moss retrieval failed — the index could not be queried.",
  llm_config: "The reasoning model is not configured. Set the OLLAMA_* environment variables.",
  llm_request: "The reasoning model provider is unreachable or returned an error.",
  llm_malformed: "The reasoning model returned a malformed response.",
  database: "A database error occurred.",
  internal: "Unexpected server error.",
};

const PIPELINE: { step: string; title: string; label: string }[] = [
  { step: "01", title: "ASK", label: "Ask a field question" },
  { step: "02", title: "MOSS RETRIEVES", label: "Operational context · milliseconds" },
  { step: "03", title: "AI REASONS", label: "Grounded answer · evidence-backed" },
];

const LOADING_STAGES: { n: string; title: string; label: string }[] = [
  { n: "01", title: "MOSS RETRIEVAL", label: "Finding operational context" },
  { n: "02", title: "AI REASONING", label: "Reasoning over retrieved evidence" },
];

export interface InvestigationPanelProps {
  phase: InvestigationPhase;
  errorKind: string | null;
  result: InvestigateResult | null;
  question: string;
  defaultQuestion: string;
  examples: string[];
  onSubmit: (question: string) => void;
  onQuestionChange: (question: string) => void;
}

export function InvestigationPanel({
  phase,
  errorKind,
  result,
  question,
  defaultQuestion,
  examples,
  onSubmit,
  onQuestionChange,
}: InvestigationPanelProps) {
  const [loadingStep, setLoadingStep] = useState(0);

  useEffect(() => {
    if (phase !== "loading") return;
    const timer = setTimeout(() => setLoadingStep(1), 800);
    return () => clearTimeout(timer);
  }, [phase]);

  const loading = phase === "loading";

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = question.trim();
    if (value.length === 0 || loading) return;
    setLoadingStep(0);
    onSubmit(value);
  }

  return (
    <section className="px-6 py-5">
      <form onSubmit={handleSubmit} className="flex gap-3">
        <input
          type="text"
          value={question}
          onChange={(event) => onQuestionChange(event.target.value)}
          placeholder="Ask an investigation question…"
          disabled={loading}
          className="min-w-0 flex-1 border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={loading || question.trim().length === 0}
          className="shrink-0 border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-100 transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Investigating…" : "Investigate"}
        </button>
      </form>

      <div className="mt-5">
        {phase === "loading" && (
          <div className="border border-zinc-800 bg-zinc-950 px-4 py-4">
            <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-600">
              FieldOS pipeline
            </div>
            <ul className="mt-3 space-y-3">
              {LOADING_STAGES.map((stage, i) => {
                const active = i === loadingStep;
                return (
                  <li key={stage.n} className={`flex items-baseline gap-3 ${active ? "" : "opacity-40"}`}>
                    <span
                      className={`w-4 shrink-0 font-mono text-[10px] ${
                        active ? "animate-pulse text-amber-400" : "text-zinc-600"
                      }`}
                    >
                      {active ? "▌" : "·"}
                    </span>
                    <div className="min-w-0">
                      <div className="font-mono text-xs tracking-widest text-zinc-200">
                        {stage.n} {stage.title}
                      </div>
                      <div className="mt-0.5 text-[11px] text-zinc-500">{stage.label}</div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {phase === "error" && (
          <div className="border border-red-900 bg-red-950/40 px-4 py-3">
            <div className="text-[11px] font-mono uppercase tracking-wider text-red-400">
              Investigation unavailable
            </div>
            <p className="mt-1 text-sm text-red-200/90">
              {ERROR_TEXT[errorKind ?? "internal"] ?? ERROR_TEXT.internal}
            </p>
          </div>
        )}

        {phase === "success" && result && (
          <div className="border border-zinc-800 bg-zinc-900/40 px-4 py-4">
            <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-500">
              Findings · {result.retrieval.documents} evidence records
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-zinc-200">
              {result.answer}
            </p>
          </div>
        )}

        {phase === "idle" && (
          <div className="space-y-4">
            <ol className="flex flex-col gap-3 border border-zinc-800 bg-zinc-950 px-5 py-4 sm:flex-row sm:items-center sm:gap-4">
              {PIPELINE.map((s, i) => (
                <li key={s.title} className="flex items-center gap-3">
                  <span className="font-mono text-[10px] text-zinc-600">{s.step}</span>
                  <div className="min-w-0">
                    <div className="font-mono text-xs font-semibold tracking-widest text-zinc-200">
                      {s.title}
                    </div>
                    <div className="mt-0.5 text-[11px] text-zinc-500">{s.label}</div>
                  </div>
                  {i < PIPELINE.length - 1 && (
                    <span aria-hidden className="hidden text-zinc-700 sm:inline">→</span>
                  )}
                </li>
              ))}
            </ol>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-600">Try</span>
              {examples.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => onQuestionChange(ex)}
                  className="border border-zinc-800 bg-zinc-900/60 px-3 py-1.5 text-xs text-zinc-400 transition-colors hover:border-zinc-600 hover:bg-zinc-800 hover:text-zinc-200"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}