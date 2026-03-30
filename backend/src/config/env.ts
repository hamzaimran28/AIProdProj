import dotenv from "dotenv";

dotenv.config();

const port = Number(process.env.PORT) || 3001;

/** Matches Groq dashboard “custom_models” id (override with GROQ_MODEL). */
const DEFAULT_GROQ_MODEL = "openai/gpt-oss-120b";

export const env = {
  port,
  groqApiKey: process.env.GROQ_API_KEY ?? "",
  groqModel: process.env.GROQ_MODEL ?? DEFAULT_GROQ_MODEL,
  nodeEnv: process.env.NODE_ENV ?? "development",
} as const;

export function requireGroqKey(): string {
  if (!env.groqApiKey) {
    throw new Error("GROQ_API_KEY is not set");
  }
  return env.groqApiKey;
}
