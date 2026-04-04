import OpenAI, { APIError } from "openai";
import { env, requireGroqKey } from "../config/env.js";
import type { PlatformId } from "../constants/platforms.js";
import { generateImageFromPrompt } from "./huggingface.service.js";
import { summarizeTranscript } from "./openrouter.service.js";

const GROQ_BASE_URL = "https://api.groq.com/openai/v1";

function getClient(): OpenAI {
  return new OpenAI({
    apiKey: requireGroqKey(),
    baseURL: GROQ_BASE_URL,
  });
}

/** Groq/OpenAI may return `content` as a string or as an array of content parts. */
function messageContentToString(content: unknown): string {
  if (content == null) return "";
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part: unknown) => {
        if (typeof part === "object" && part !== null && "text" in part) {
          const t = (part as { text?: unknown }).text;
          return typeof t === "string" ? t : "";
        }
        return "";
      })
      .join("");
  }
  return "";
}

function looksLikeEditorialOutlinePrompt(s: string): boolean {
  // Non-global regex: global .test() mutates lastIndex and breaks repeat checks.
  return /\b(?:Core thesis|Key points|Notable examples or stories|Hook ideas|CTA or closing angle)\b/i.test(
    s,
  );
}

/** Groq sometimes echoes host / transcript wording instead of a visual scene. */
function looksLikeSpokenScriptOrTranscriptProse(s: string): boolean {
  const lower = s.toLowerCase();
  return (
    /welcome back|to the channel|today we('re| are)|we are talking|talking about why|hit record|everything that\b/i.test(
      lower,
    ) ||
    /don'?t forget to|like and subscribe|smash that|leave a comment below/i.test(
      lower,
    ) ||
    (lower.length > 60 &&
      /\b(the hardest part|being a creator|not hitting)\b/i.test(lower))
  );
}

/** Model or token limits often cut mid-phrase ("sits at,"); complete or trim to a full clause. */
function repairDanglingImagePromptDescription(main: string): string {
  let t = main.trim().replace(/,\s*$/g, "").trim();
  if (t.length < 8) return t;

  if (/\bsits\s+at$/i.test(t)) {
    return `${t} a desk with glowing monitors, warm lamp, moody shadows`;
  }
  if (/\bstands\s+at$/i.test(t) || /\bwaiting\s+at$/i.test(t)) {
    return `${t} a simple workstation, soft side light`;
  }
  if (/\bat$/i.test(t)) {
    return `${t} a desk and screens, low-key lighting`;
  }
  if (/\bwith$/i.test(t)) {
    return `${t} soft rim light and shallow depth of field`;
  }
  if (/\band$/i.test(t)) {
    return t.replace(/\s+and\s*$/i, "").trim();
  }
  if (/\bthe$/i.test(t)) {
    return `${t} warm glow of screens on their face`;
  }

  return t;
}

function truncatePromptAtClauseBoundary(main: string, maxLen: number): string {
  if (main.length <= maxLen) return main;
  const slice = main.slice(0, maxLen);
  const dot = slice.lastIndexOf(". ");
  if (dot >= 50) {
    return slice.slice(0, dot + 1).trim();
  }
  const comma = slice.lastIndexOf(", ");
  if (comma >= 50) {
    return slice.slice(0, comma).trim();
  }
  return slice.trim();
}

const IMAGE_PROMPT_STYLE_SUFFIX = ", digital illustration, soft light, no text";
/** Scene description budget before the short style suffix (keep total prompt compact for FLUX). */
const IMAGE_PROMPT_MAX_SCENE_CHARS = 140;

const GENERIC_FLUX_SCENE_FALLBACK =
  "Tired creator at a desk at night, monitor glow, coffee steam, warm lamp, moody shadows";

function genericFluxImagePromptFallback(): string {
  return `${GENERIC_FLUX_SCENE_FALLBACK}${IMAGE_PROMPT_STYLE_SUFFIX}`;
}

/** Turn Groq's imagePrompt field into a FLUX-ready string, or null if unusable. */
function finalizeImageSceneFromGroq(raw: string): string | null {
  let s = raw.replace(/\s+/g, " ").trim().replace(/^["']|["']$/g, "").trim();
  if (s.length < 12) return null;
  if (looksLikeEditorialOutlinePrompt(s)) return null;
  if (looksLikeSpokenScriptOrTranscriptProse(s)) return null;

  s = repairDanglingImagePromptDescription(s);
  s = truncatePromptAtClauseBoundary(s, IMAGE_PROMPT_MAX_SCENE_CHARS);
  s = repairDanglingImagePromptDescription(s);
  s = truncatePromptAtClauseBoundary(s, IMAGE_PROMPT_MAX_SCENE_CHARS);

  const line = s.trim();
  if (line.length < 12) return null;
  return `${line}${IMAGE_PROMPT_STYLE_SUFFIX}`.slice(0, 400);
}

function platformInstructions(platform: PlatformId): string {
  switch (platform) {
    case "twitter":
      return `X (Twitter):
    - Write ONLY ONE tweet (do NOT create a thread).
    - The tweet MUST be under 280 characters.
    - Write it as a SINGLE paragraph (no line breaks).
    - Keep it concise, punchy, and impactful.
    - Start with a strong hook that creates curiosity.
    - Focus on one core idea only.
    - Avoid fluff and unnecessary words.
    - No hashtags unless absolutely necessary.`;

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

/** Extra JSON field when generating a shared image alongside posts. */
const GROQ_JSON_IMAGE_PROMPT_KEY = "imagePrompt";

function buildSystemPrompt(
  platforms: PlatformId[],
  extraInstructions: string | undefined,
  sourceWasSummarized: boolean,
  emitImagePrompt: boolean,
): string {
  const platformDetails = platforms
    .map((p) => `- "${p}":\n${platformInstructions(p)}`)
    .join("\n\n");

  const extra = extraInstructions?.trim()
    ? `\n\nAdditional global instructions:\n${extraInstructions.trim()}`
    : "";

  const sourceIntro = sourceWasSummarized
    ? "The source text has already been summarized from the transcript. Your job is to:"
    : "The source text is the transcript (or excerpt) as provided—use it faithfully. Your job is to:";

  const jsonKeys = emitImagePrompt
    ? JSON.stringify([...platforms, GROQ_JSON_IMAGE_PROMPT_KEY])
    : JSON.stringify(platforms);

  const imageBlock = emitImagePrompt
    ? `

    IMAGE PROMPT (same JSON response):
    11. Include key "${GROQ_JSON_IMAGE_PROMPT_KEY}" (exact spelling) with ONE short string for a text-to-image model.
    12. "${GROQ_JSON_IMAGE_PROMPT_KEY}" must describe ONLY a visual scene (who/where/light/mood)—NOT spoken dialogue, NOT quotes from the transcript, NOT "welcome back" or host intros, NOT social platform names, NOT listing multiple monitors with different apps.
    13. Keep that string under ~140 characters of pure visual description (no style tags; style is added later).
    14. End on a complete phrase (not "at", "with", "and"). No readable text or logos in the imagined image.`
    : "";

  return `You are an expert content editor specializing in adapting long-form source material into high-performing platform-specific posts.

    ${sourceIntro}
    - Extract the strongest ideas
    - Adapt tone, structure, and format per platform
    - Optimize for readability and engagement
    - Stay faithful to the provided source material

    Platforms:
    ${platformDetails}
    ${extra}

    STRICT OUTPUT RULES:
    1. Output MUST be valid JSON.
    2. Use ONLY these keys: ${jsonKeys}.
    3. Each value MUST be a single string.
    4. Use "\\n" for line breaks inside strings.
    5. Do NOT include markdown, explanations, or code fences.
    6. Do NOT include any text before or after the JSON.
    7. Do NOT hallucinate or invent facts.
    8. Ensure content is native to each platform (NOT copy-pasted across).
    9. Ensure hooks are optimized for truncation behavior on each platform.
    10. Output must be directly parsable by JSON.parse().${imageBlock}`;
}

function buildUserPrompt(sourceText: string): string {
  return `Transform the following source material into platform-specific posts.

  Guidelines:
  - Focus on the most valuable and engaging ideas.
  - Remove filler, repetition, and irrelevant details.
  - Adapt tone and structure per platform.

  Source material:
  """
  ${sourceText.trim()}
  """`;
}

async function runGroqPostGeneration(
  sourceText: string,
  platforms: PlatformId[],
  extraInstructions: string | undefined,
  sourceWasSummarized: boolean,
  emitImagePrompt: boolean,
): Promise<string> {
  const client = getClient();
  try {
    const completion = await client.chat.completions.create({
      model: env.groqModel,
      messages: [
        {
          role: "system",
          content: buildSystemPrompt(
            platforms,
            extraInstructions,
            sourceWasSummarized,
            emitImagePrompt,
          ),
        },
        { role: "user", content: buildUserPrompt(sourceText) },
      ],
      temperature: 0.5,
      max_tokens: env.groqMaxCompletionTokens,
    });
    return messageContentToString(completion.choices[0]?.message?.content);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    const tooLarge =
      (e instanceof APIError && e.status === 413) ||
      /413|too large|TPM|rate limit/i.test(msg);
    if (tooLarge) {
      throw new Error(
        "Request too large for your Groq tier: shorten the transcript, lower GROQ_MAX_COMPLETION_TOKENS / GROQ_MAX_TRANSCRIPT_CHARS in .env, or upgrade your plan at https://console.groq.com/settings/billing",
      );
    }
    throw e;
  }
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

function parsePostsJsonWithOptionalImage(
  text: string,
  platforms: PlatformId[],
): { posts: Record<string, string>; imagePromptRaw?: string } {
  const all = extractJsonObject(text);
  const imageRaw = all[GROQ_JSON_IMAGE_PROMPT_KEY]?.trim();
  const posts: Record<string, string> = {};
  for (const p of platforms) {
    const v = all[p];
    if (typeof v === "string") {
      posts[p] = v;
    }
  }
  return { posts, imagePromptRaw: imageRaw };
}

export async function generatePostsFromTranscript(
  transcript: string,
  platforms: PlatformId[],
  extraInstructions?: string,
  options?: { includeImage?: boolean; imagePrompt?: string },
): Promise<{
  posts: Record<string, string>;
  truncated: boolean;
  transcriptCharsUsed: number;
  notice?: string;
  summary: string;
  summaryModel: string;
  summarized: boolean;
  sharedImage?: { mimeType: string; base64: string; promptUsed: string };
  imageError?: string;
}> {
  let truncated = false;
  let notice: string | undefined;
  const maxChars = env.groqMaxTranscriptChars;
  let body = transcript;
  if (body.length > maxChars) {
    body = body.slice(0, maxChars);
    truncated = true;
    notice = `Transcript was truncated to ${maxChars.toLocaleString()} characters before processing to stay within request limits.`;
  }

  const threshold = env.summarizeMinChars;
  let sourceText: string;
  let summaryModel: string;
  let summarized: boolean;

  if (body.length > threshold) {
    const { summary, model } = await summarizeTranscript(body);
    sourceText = summary;
    summaryModel = model;
    summarized = true;
  } else {
    sourceText = body;
    summaryModel = "original";
    summarized = false;
  }

  const includeImage = options?.includeImage === true;
  const presetImagePrompt = options?.imagePrompt?.trim();

  const raw = await runGroqPostGeneration(
    sourceText,
    platforms,
    extraInstructions,
    summarized,
    includeImage && !presetImagePrompt,
  );

  if (!raw) {
    throw new Error("Empty response from Groq");
  }

  let posts: Record<string, string>;
  let imagePromptRaw: string | undefined;
  try {
    const parsed = parsePostsJsonWithOptionalImage(raw, platforms);
    posts = parsed.posts;
    imagePromptRaw = parsed.imagePromptRaw;
  } catch {
    throw new Error("Invalid JSON from model. Please try again.");
  }

  for (const p of platforms) {
    if (typeof posts[p] !== "string" || posts[p].trim().length === 0) {
      throw new Error(`Missing or empty post for platform: ${p}`);
    }
  }

  let resolvedImagePrompt: string | null = null;
  if (includeImage) {
    if (presetImagePrompt) {
      resolvedImagePrompt = presetImagePrompt;
    } else {
      const fromGroq =
        imagePromptRaw != null && imagePromptRaw.length > 0
          ? finalizeImageSceneFromGroq(imagePromptRaw)
          : null;
      resolvedImagePrompt =
        fromGroq ?? (includeImage ? genericFluxImagePromptFallback() : null);
    }
  }

  let sharedImage:
    | { mimeType: string; base64: string; promptUsed: string }
    | undefined;
  let imageError: string | undefined;
  if (includeImage && resolvedImagePrompt) {
    try {
      const { buffer, mimeType } =
        await generateImageFromPrompt(resolvedImagePrompt);
      sharedImage = {
        mimeType,
        base64: buffer.toString("base64"),
        promptUsed: resolvedImagePrompt,
      };
    } catch (e) {
      imageError = e instanceof Error ? e.message : String(e);
    }
  }

  let mergedNotice: string | undefined = notice;
  if (summarized) {
    const summaryLine = `Source material was summarized with OpenRouter (${summaryModel}) before Groq generated the posts.`;
    mergedNotice = notice ? `${notice} ${summaryLine}` : summaryLine;
  }

  return {
    posts,
    truncated,
    transcriptCharsUsed: body.length,
    notice: mergedNotice,
    summary: sourceText,
    summaryModel,
    summarized,
    sharedImage,
    imageError,
  };
}
