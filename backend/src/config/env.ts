import dotenv from "dotenv";

dotenv.config();

const port = Number(process.env.PORT) || 3001;

const DEFAULT_GROQ_MODEL = "openai/gpt-oss-120b";
const DEFAULT_OPENROUTER_MODEL = "openrouter/free";
const DEFAULT_GROQ_MAX_COMPLETION_TOKENS = 4096;
const DEFAULT_GROQ_MAX_TRANSCRIPT_CHARS = 12_000;
const DEFAULT_OPENROUTER_MAX_COMPLETION_TOKENS = 1200;
/** Transcripts longer than this (chars) are summarized via OpenRouter; shorter use verbatim text. */
const DEFAULT_SUMMARIZE_MIN_CHARS = 2500;

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
