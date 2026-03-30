import OpenAI from "openai";
import { env, requireGroqKey } from "../config/env.js";
import type { PlatformId } from "../constants/platforms.js";

const GROQ_BASE_URL = "https://api.groq.com/openai/v1";
/** Completion cap; model may allow higher — see Groq model `max_tokens` in console */
const MAX_COMPLETION_TOKENS = 32_768;

const MAX_TRANSCRIPT_CHARS = 40_000;

function getClient(): OpenAI {
  return new OpenAI({
    apiKey: requireGroqKey(),
    baseURL: GROQ_BASE_URL,
  });
}

function platformInstructions(platform: PlatformId): string {
  switch (platform) {
    case "twitter":
      return `X (Twitter): Write a thread (numbered 1/, 2/, …). Each tweet under 280 characters. No hashtags unless essential. Engaging hooks.`;
    case "linkedin":
      return `LinkedIn: Professional short post (3–6 short paragraphs). Line breaks between paragraphs. Optional 3–5 relevant hashtags at end.`;
    case "newsletter":
      return `Newsletter teaser: 2–4 sentences + optional subject line on first line as "Subject: ...". Enticing, not clickbait.`;
    case "instagram":
      return `Instagram caption: First line hook, then body with line breaks; optional 3–8 hashtags at end. Conversational.`;
    default:
      return "";
  }
}

function buildSystemPrompt(
  platforms: PlatformId[],
  extraInstructions?: string,
): string {
  const lines = platforms.map((p) => `- "${p}": ${platformInstructions(p)}`);
  const extra = extraInstructions?.trim()
    ? `\nGlobal instructions from user: ${extraInstructions.trim()}`
    : "";
  return `You are an editor who turns long-form transcripts into platform-specific text posts.
${extra}
Rules:
- Output ONLY valid JSON with keys exactly: ${JSON.stringify(platforms)}.
- Each value is a single string (the full post for that platform). Use \\n for line breaks inside strings.
- Do not invent facts not in the transcript; you may compress and rephrase.
- Do not include markdown code fences or any text outside JSON.`;
}

function buildUserPrompt(transcript: string): string {
  return `Transcript:\n\n${transcript}`;
}

function extractJsonObject(text: string): Record<string, string> {
  const trimmed = text.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Model did not return JSON");
  }
  const slice = trimmed.slice(start, end + 1);
  const parsed = JSON.parse(slice) as unknown;
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("Invalid JSON shape");
  }
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(parsed)) {
    if (typeof v === "string") {
      out[k] = v;
    }
  }
  return out;
}

export async function generatePostsFromTranscript(
  transcript: string,
  platforms: PlatformId[],
  extraInstructions?: string,
): Promise<{
  posts: Record<string, string>;
  truncated: boolean;
  transcriptCharsUsed: number;
  notice?: string;
}> {
  let truncated = false;
  let notice: string | undefined;
  let body = transcript;
  if (body.length > MAX_TRANSCRIPT_CHARS) {
    body = body.slice(0, MAX_TRANSCRIPT_CHARS);
    truncated = true;
    notice = `Transcript was truncated to ${MAX_TRANSCRIPT_CHARS.toLocaleString()} characters for this request.`;
  }

  const client = getClient();
  const completion = await client.chat.completions.create({
    model: env.groqModel,
    messages: [
      {
        role: "system",
        content: buildSystemPrompt(platforms, extraInstructions),
      },
      { role: "user", content: buildUserPrompt(body) },
    ],
    temperature: 0.5,
    max_tokens: MAX_COMPLETION_TOKENS,
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) {
    throw new Error("Empty response from Groq");
  }

  let posts: Record<string, string>;
  try {
    posts = extractJsonObject(raw);
  } catch {
    throw new Error("Invalid JSON from model. Please try again.");
  }

  for (const p of platforms) {
    if (typeof posts[p] !== "string" || posts[p].trim().length === 0) {
      throw new Error(`Missing or empty post for platform: ${p}`);
    }
  }

  return {
    posts,
    truncated,
    transcriptCharsUsed: body.length,
    notice,
  };
}
