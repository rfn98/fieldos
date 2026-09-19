"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { AssetSummary, InvestigateResult, InvestigationPhase } from "@/lib/types";
import { AssetSidebar } from "@/components/AssetSidebar";
import { AssetHeader } from "@/components/AssetHeader";
import { InvestigationPanel } from "@/components/InvestigationPanel";
import { VoiceControl } from "@/components/VoiceControl";
import { EvidencePanel } from "@/components/EvidencePanel";
import { RetrievalTrace } from "@/components/RetrievalTrace";

type AssetsStatus = "loading" | "loaded" | "error";

export default function Home() {
  const [assets, setAssets] = useState<AssetSummary[]>([]);
  const [assetsStatus, setAssetsStatus] = useState<AssetsStatus>("loading");
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [question, setQuestion] = useState<string>("");

  const [phase, setPhase] = useState<InvestigationPhase>("idle");
  const [result, setResult] = useState<InvestigateResult | null>(null);
  const [errorKind, setErrorKind] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadAssets() {
      try {
        const response = await fetch("/api/assets");
        if (!response.ok) throw new Error(`assets status ${response.status}`);
        const data: { assets: AssetSummary[] } = await response.json();
        if (cancelled) return;
        setAssets(data.assets);
        const preferred = data.assets.find((asset) => asset.code === "P-204");
        setSelectedCode(preferred?.code ?? data.assets[0]?.code ?? null);
        setAssetsStatus("loaded");
      } catch (error) {
        console.error("[fieldos] failed to load assets", error);
        if (!cancelled) {
          setAssetsStatus("error");
          setSelectedCode(null);
        }
      }
    }

    loadAssets();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedAsset = useMemo(
    () => assets.find((asset) => asset.code === selectedCode) ?? null,
    [assets, selectedCode]
  );

  const defaultQuestion = selectedAsset
    ? `Why did ${selectedAsset.code} fail before?`
    : "Why did P-204 fail before?";

  const exampleQuestions = useMemo(() => {
    if (!selectedAsset) return [];
    return [
      `Why did ${selectedAsset.code} fail before?`,
      "What should I check first?",
      "What maintenance history matters?",
    ];
  }, [selectedAsset]);

  const handleSelectAsset = useCallback((code: string) => {
    setSelectedCode(code);
    setResult(null);
    setPhase("idle");
    setErrorKind(null);
  }, []);

  const handleInvestigate = useCallback(async (question: string) => {
    setQuestion(question);
    setPhase("loading");
    setResult(null);
    setErrorKind(null);

    try {
      const response = await fetch("/api/investigate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setErrorKind(data?.error?.kind ?? "internal");
        setPhase("error");
        return;
      }
      setResult(data);
      setPhase("success");
    } catch (error) {
      console.error("[fieldos] investigation failed", error);
      setErrorKind("network");
      setPhase("error");
    }
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-950 text-zinc-200">
      <AssetSidebar
        assets={assets}
        status={assetsStatus}
        selectedCode={selectedCode}
        onSelect={handleSelectAsset}
      />

      <main className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        {selectedAsset ? (
          <>
            <AssetHeader asset={selectedAsset} />
            <VoiceControl phase={phase} result={result} onSubmit={handleInvestigate} />
            <InvestigationPanel
              key={selectedAsset.code}
              phase={phase}
              errorKind={errorKind}
              result={result}
              question={question}
              defaultQuestion={defaultQuestion}
              onQuestionChange={setQuestion}
              examples={exampleQuestions}
              onSubmit={handleInvestigate}
            />
            {result && phase === "success" && (
              <>
                <EvidencePanel evidence={result.evidence} />
                <RetrievalTrace
                  retrieval={result.retrieval}
                  model={result.model}
                  llmMs={result.latency?.llmMs}
                  totalMs={result.latency?.totalMs}
                />
              </>
            )}
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6">
            {assetsStatus === "loading" && (
              <p className="text-xs font-mono text-zinc-500">Loading operations data…</p>
            )}
            {assetsStatus === "error" && (
              <>
                <div className="border border-red-900 bg-red-950/40 px-4 py-3 text-center">
                  <div className="text-[11px] font-mono uppercase tracking-wider text-red-400">
                    Asset data unavailable
                  </div>
                  <p className="mt-1 text-sm text-red-200/90">
                    Could not load the asset list from the FieldOS API.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-zinc-100 hover:bg-zinc-700"
                >
                  Retry
                </button>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}