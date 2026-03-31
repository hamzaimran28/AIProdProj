import dotenv from "dotenv";

dotenv.config();

const port = Number(process.env.PORT) || 3001;

/** Matches Groq dashboard “custom_models” id (override with GROQ_MODEL). */
const DEFAULT_GROQ_MODEL = "openai/gpt-oss-120b";

/** Default completion budget — keep low so prompt + max_tokens fits Groq tier limits (avoid 413 / TPM issues). */
const DEFAULT_GROQ_MAX_COMPLETION_TOKENS = 4096;
/** Default transcript cap before sending to Groq — large inputs + huge max_tokens exceed free-tier request limits. */
const DEFAULT_GROQ_MAX_TRANSCRIPT_CHARS = 12_000;

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
  /** Max tokens the model may generate (JSON posts). Tune via GROQ_MAX_COMPLETION_TOKENS. */
  groqMaxCompletionTokens: clampInt(
    process.env.GROQ_MAX_COMPLETION_TOKENS,
    DEFAULT_GROQ_MAX_COMPLETION_TOKENS,
    256,
    32_768,
  ),
  /** Transcript length sent to Groq after truncation. Tune via GROQ_MAX_TRANSCRIPT_CHARS. */
  groqMaxTranscriptChars: clampInt(
    process.env.GROQ_MAX_TRANSCRIPT_CHARS,
    DEFAULT_GROQ_MAX_TRANSCRIPT_CHARS,
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
