import dotenv from "dotenv";

dotenv.config();

const port = Number(process.env.PORT) || 3001;

const DEFAULT_GROQ_MODEL = "openai/gpt-oss-120b";
const DEFAULT_OPENROUTER_MODEL = "openrouter/free";
const DEFAULT_GROQ_MAX_COMPLETION_TOKENS = 4096;
const DEFAULT_GROQ_MAX_TRANSCRIPT_CHARS = 12_000;
const DEFAULT_OPENROUTER_MAX_COMPLETION_TOKENS = 1200;
/** Hugging Face Inference Router — FLUX.1-schnell (text-to-image). */
export const HF_FLUX_SCHNELL_ROUTER_URL =
  "https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell";

const DEFAULT_HF_NUM_INFERENCE_STEPS = 4;
const DEFAULT_HF_GUIDANCE_SCALE = 0;
/** Transcripts longer than this (chars) are summarized via OpenRouter; shorter use verbatim text. */
const DEFAULT_SUMMARIZE_MIN_CHARS = 2500;

/** Trim .env value, strip accidental quotes, fix common hf_ / yhf_ typo. */
function normalizeHuggingFaceToken(raw: string): string {
  let t = raw.trim();
  if (
    (t.startsWith('"') && t.endsWith('"')) ||
    (t.startsWith("'") && t.endsWith("'"))
  ) {
    t = t.slice(1, -1).trim();
  }
  if (t.startsWith("yhf_")) {
    t = `hf_${t.slice(4)}`;
  }
  return t;
}

function clampInt(
  raw: string | undefined,
  fallback: number,
  min: number,
  max: number,
): number {
  if (raw === undefined || raw.trim() === "") return fallback;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export const env = {
  port,
  groqApiKey: process.env.GROQ_API_KEY ?? "",
  groqModel: process.env.GROQ_MODEL ?? DEFAULT_GROQ_MODEL,
  openRouterApiKey: process.env.OPENROUTER_API_KEY ?? "",
  openRouterModel: process.env.OPENROUTER_MODEL ?? DEFAULT_OPENROUTER_MODEL,
  groqMaxCompletionTokens: clampInt(
    process.env.GROQ_MAX_COMPLETION_TOKENS,
    DEFAULT_GROQ_MAX_COMPLETION_TOKENS,
    256,
    32_768,
  ),
  groqMaxTranscriptChars: clampInt(
    process.env.GROQ_MAX_TRANSCRIPT_CHARS,
    DEFAULT_GROQ_MAX_TRANSCRIPT_CHARS,
    100,
    120_000,
  ),
  openRouterMaxCompletionTokens: clampInt(
    process.env.OPENROUTER_MAX_COMPLETION_TOKENS,
    DEFAULT_OPENROUTER_MAX_COMPLETION_TOKENS,
    128,
    8_192,
  ),
  huggingfaceApiToken: normalizeHuggingFaceToken(
    process.env.HUGGINGFACE_API_TOKEN ?? "",
  ),
  huggingfaceImageApiUrl:
    process.env.HUGGINGFACE_IMAGE_API_URL?.trim() || HF_FLUX_SCHNELL_ROUTER_URL,
  huggingfaceImageNumInferenceSteps: clampInt(
    process.env.HUGGINGFACE_IMAGE_NUM_INFERENCE_STEPS,
    DEFAULT_HF_NUM_INFERENCE_STEPS,
    1,
    50,
  ),
  huggingfaceImageGuidanceScale: (() => {
    const raw = process.env.HUGGINGFACE_IMAGE_GUIDANCE_SCALE;
    if (raw === undefined || raw.trim() === "") return DEFAULT_HF_GUIDANCE_SCALE;
    const n = Number.parseFloat(raw);
    return Number.isFinite(n) ? Math.min(20, Math.max(0, n)) : DEFAULT_HF_GUIDANCE_SCALE;
  })(),
  /** Summarize only when transcript length (after server truncation) exceeds this. */
  summarizeMinChars: clampInt(
    process.env.SUMMARIZE_MIN_CHARS,
    DEFAULT_SUMMARIZE_MIN_CHARS,
    100,
    120_000,
  ),
  nodeEnv: process.env.NODE_ENV ?? "development",
} as const;

export function requireGroqKey(): string {
  if (!env.groqApiKey) {
    throw new Error("GROQ_API_KEY is not set");
  }
  return env.groqApiKey;
}

export function requireOpenRouterKey(): string {
  if (!env.openRouterApiKey) {
    throw new Error("OPENROUTER_API_KEY is not set");
  }
  return env.openRouterApiKey;
}

export function requireHuggingfaceToken(): string {
  if (!env.huggingfaceApiToken) {
    throw new Error("HUGGINGFACE_API_TOKEN is not set");
  }
  return env.huggingfaceApiToken;
}
