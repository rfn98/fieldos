import {
  env,
  pipeline,
  type DeviceType,
  type FeatureExtractionPipeline,
} from "@huggingface/transformers";
import { PipeError } from "./types";

const MODEL_ID = (process.env.EMBEDDING_MODEL_ID ?? "Xenova/all-MiniLM-L6-v2").trim();

// Force the WASM/WebAssembly onnx backend. This removes the need for the
// native `libonnxruntime.so.1` shared object (onnxruntime-node native), which
// is not available on serverless runtimes like Vercel. Setting numThreads to 1
// runs a single-threaded WASM build that is fully self-contained.
const wasmBackend = env.backends.onnx.wasm;
if (wasmBackend) wasmBackend.numThreads = 1;

export const EMBEDDING_DIMENSION = 384;

type EmbeddingPipeline = FeatureExtractionPipeline;

type PipelineFactory = (
  task: string,
  modelId: string,
  options?: { device?: DeviceType }
) => Promise<unknown>;

let pipelinePromise: Promise<EmbeddingPipeline> | null = null;

function getPipeline(): Promise<EmbeddingPipeline> {
  pipelinePromise ??= (async () => {
    try {
      const extractor = await (pipeline as PipelineFactory)(
        "feature-extraction",
        MODEL_ID
      );
      return extractor as EmbeddingPipeline;
    } catch (error) {
      pipelinePromise = null;

      console.error("[embedding] Failed to load model:", error);

      throw new PipeError(
        "moss_config",
        503,
        `Embedding model could not be loaded (${MODEL_ID}).`
      );
    }
  })();

  return pipelinePromise;
}

/**
 * Embeds a single text into a normalized 384-dimensional vector using the
 * shared `Xenova/all-MiniLM-L6-v2` feature-extraction pipeline (mean pooling,
 * L2-normalized). The pipeline is loaded lazily once per process.
 */
export async function embedText(text: string): Promise<number[]> {
  const extractor = await getPipeline();

  let rows: unknown;
  try {
    const output = await extractor(text, { pooling: "mean", normalize: true });
    rows = (output as { tolist: () => unknown }).tolist();
  } catch {
    throw new PipeError("moss_config", 503, "Embedding generation failed.");
  }

  if (!Array.isArray(rows) || rows.length !== 1 || !Array.isArray(rows[0])) {
    throw new PipeError("moss_config", 503, "Embedding output had an unexpected shape.");
  }

  const vector = rows[0];
  if (
    !Array.isArray(vector) ||
    vector.length !== EMBEDDING_DIMENSION ||
    !vector.every((value) => typeof value === "number" && Number.isFinite(value))
  ) {
    throw new PipeError(
      "moss_config",
      503,
      `Embedding dimension was ${
        Array.isArray(vector) ? vector.length : "n/a"
      }, expected ${EMBEDDING_DIMENSION}.`
    );
  }

  return vector as number[];
}