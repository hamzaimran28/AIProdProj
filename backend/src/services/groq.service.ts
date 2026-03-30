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
      return `X (Twitter):
    - Convert into a THREAD using "1/", "2/", etc.
    - Each tweet MUST be under 280 characters.
    - Prioritize clarity and punchiness (short sentences perform best).
    - First tweet MUST be a strong hook that creates curiosity.
    - Avoid fluff, filler, or long explanations.
    - No hashtags unless absolutely necessary.
    - Each tweet should feel complete and skimmable.`;

    case "linkedin":
      return `LinkedIn:
    - Write 3-6 concise paragraphs.
    - First 1-2 lines MUST act as a hook (only ~200 characters are visible before truncation).
    - Use a professional but human tone.
    - Prioritize storytelling, insights, or lessons.
    - Each paragraph should be short (1-3 sentences).
    - Add spacing for readability.
    - Optionally include 3-5 relevant hashtags at the end.`;

    case "newsletter":
      return `Newsletter teaser:
    - Write 2-4 compelling sentences.
    - Focus on curiosity, value, and clarity.
    - Avoid clickbait; build genuine intrigue.
    - Optionally include a subject line as the FIRST line:
      "Subject: ..."
    - Make the reader want to open or click.`;

    case "instagram":
      return `Instagram caption:
    - First line MUST be a strong hook (only ~125 characters are visible initially).
    - Use short paragraphs with line breaks for readability.
    - Tone should be conversational and relatable.
    - Encourage engagement subtly (emotion, relatability, insight).
    - Avoid large text blocks.
    - Add 3-8 relevant hashtags at the end (optional, not spammy).`;

    default:
      return "";
  }
}

function buildSystemPrompt(
  platforms: PlatformId[],
  extraInstructions?: string,
): string {
  const platformDetails = platforms
    .map((p) => `- "${p}":\n${platformInstructions(p)}`)
    .join("\n\n");

  const extra = extraInstructions?.trim()
    ? `\n\nAdditional global instructions:\n${extraInstructions.trim()}`
    : "";

  return `You are an expert content editor specializing in adapting long-form transcripts into high-performing platform-specific posts.

    Your goal is NOT to summarize blindly, but to:
    - Extract key ideas
    - Adapt tone, structure, and format per platform
    - Optimize for readability and engagement

    Platforms:
    ${platformDetails}
    ${extra}

    STRICT OUTPUT RULES:
    1. Output MUST be valid JSON.
    2. Use ONLY these keys: ${JSON.stringify(platforms)}.
    3. Each value MUST be a single string.
    4. Use "\\n" for line breaks inside strings.
    5. Do NOT include markdown, explanations, or code fences.
    6. Do NOT include any text before or after the JSON.
    7. Do NOT hallucinate or invent facts.
    8. Ensure content is native to each platform (NOT copy-pasted across).
    9. Ensure hooks are optimized for truncation behavior on each platform.
    10. Output must be directly parsable by JSON.parse().`;
}

function buildUserPrompt(transcript: string): string {
  return `Transform the following transcript into platform-specific posts.

  Guidelines:
  - Focus on the most valuable and engaging ideas.
  - Remove filler, repetition, and irrelevant details.
  - Adapt tone and structure per platform.

  Transcript:
  """
  ${transcript.trim()}
  """`;
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
