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

/** Matches the structured summary format from openrouter.service summarizer. */
const EDITORIAL_OUTLINE_LABEL =
  /\b(?:Core thesis|Key points|Notable examples or stories|Hook ideas|CTA or closing angle)\b\s*:?/gi;

function stripEditorialOutlineLabels(text: string): string {
  return text
    .replace(EDITORIAL_OUTLINE_LABEL, " ")
    .replace(/\s+/g, " ")
    .replace(/["'`]/g, "")
    .trim();
}

function looksLikeEditorialOutlinePrompt(s: string): boolean {
  // Non-global regex: global .test() mutates lastIndex and breaks repeat checks.
  return /\b(?:Core thesis|Key points|Notable examples or stories|Hook ideas|CTA or closing angle)\b/i.test(
    s,
  );
}

/** Model or token limits often cut mid-phrase ("sits at,"); complete or trim to a full clause. */
function repairDanglingImagePromptDescription(main: string): string {
  let t = main.trim().replace(/,\s*$/g, "").trim();
  if (t.length < 8) return t;

  if (/\bsits\s+at$/i.test(t)) {
    return `${t} a wide desk with curved monitors showing timelines, headphones nearby, warm key light and cool screen glow`;
  }
  if (/\bstands\s+at$/i.test(t) || /\bwaiting\s+at$/i.test(t)) {
    return `${t} a professional workstation with soft practical lighting`;
  }
  if (/\bat$/i.test(t)) {
    return `${t} a detailed editing workstation, monitors and waveforms, moody fill light`;
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

function fallbackImagePromptFromSummary(summary: string): string {
  const narrative = stripEditorialOutlineLabels(summary)
    .replace(/^[\s.,;:]+|[\s.,;:]+$/g, "")
    .slice(0, 420);
  const suffix =
    ", single coherent scene, polished digital illustration, soft cinematic lighting, no text in image";
  if (narrative.length < 24) {
    return "A creator at a desk late at night, multiple glowing monitors with timelines and waveforms, coffee mug, organized creative chaos, moody teal and amber light, editorial illustration, no text";
  }
  const base = narrative.slice(0, Math.min(narrative.length, 320));
  return `${base}${suffix}`;
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

function buildSystemPrompt(
  platforms: PlatformId[],
  extraInstructions: string | undefined,
  sourceWasSummarized: boolean,
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

async function deriveImagePromptFromSummary(summary: string): Promise<string> {
  const client = getClient();
  const strippedForModel = stripEditorialOutlineLabels(summary).slice(0, 6000);
  const userBlock = summary.trim().slice(0, 8000);

  async function requestImagePrompt(
    system: string,
    userContent: string,
  ): Promise<string> {
    const completion = await client.chat.completions.create({
      model: env.groqModel,
      messages: [
        { role: "system", content: system },
        {
          role: "user",
          content: userContent,
        },
      ],
      temperature: 0.5,
      max_tokens: 400,
    });
    const choice = completion.choices[0];
    const text = messageContentToString(choice?.message?.content).trim();
    return text;
  }

  const systemPrimary = `You write ONE English line for the FLUX text-to-image model.

Output rules:
- One line only, max 400 characters, no quotes around it.
- Finish with a complete phrase (do not end with dangling words like "at", "with", "and", or "the").
- Describe a single visible scene: concrete subjects, setting, mood, lighting, palette, composition.
- Do NOT output section titles, labels, or marketing jargon (never write: Core thesis, Key points, Hook, CTA, bullet lists, colons before abstract nouns).
- Do NOT restate the outline structure of the notes—only invent imagery that symbolizes the ideas.
- If the topic is abstract (workflows, software, productivity), show a metaphorical real-world scene (e.g. creator at workstation, studio, timelines on screens)—not words about "challenges" or "burden" as labels.
- No readable text, logos, or subtitles in the scene description.`;

  const userPrimary = `The notes below use editorial section headings—ignore the heading words; use only the substance to invent one strong image.

Notes:
${userBlock}`;

  const systemRepair = `You failed before if you repeated outline headings. Output ONE line only: a FLUX image prompt (max 400 chars)—pure visual scene, zero section titles or words like thesis, hook, CTA, key points. End with a complete phrase, not a dangling preposition.`;

  let raw = await requestImagePrompt(systemPrimary, userPrimary);
  if (!raw || looksLikeEditorialOutlinePrompt(raw)) {
    raw = await requestImagePrompt(
      systemRepair,
      `Ideas only (no headers to copy):\n${strippedForModel || userBlock}`,
    );
  }
  if (!raw) {
    return fallbackImagePromptFromSummary(summary);
  }

  let oneLine = raw.replace(/\s+/g, " ").trim();
  if (looksLikeEditorialOutlinePrompt(oneLine)) {
    oneLine = stripEditorialOutlineLabels(oneLine).replace(/\s+/g, " ").trim();
  }
  if (oneLine.length < 16 || looksLikeEditorialOutlinePrompt(oneLine)) {
    return fallbackImagePromptFromSummary(summary);
  }

  oneLine = repairDanglingImagePromptDescription(oneLine);

  const style =
    ", polished digital illustration, soft cinematic lighting, no text in image";
  const maxTotal = 520;
  const maxMain = Math.max(80, maxTotal - style.length);
  oneLine = truncatePromptAtClauseBoundary(oneLine, maxMain);
  oneLine = repairDanglingImagePromptDescription(oneLine);

  return `${oneLine}${style}`.slice(0, 2000);
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

  let imagePromptDerivationError: string | undefined;
  const [raw, resolvedImagePrompt] = await Promise.all([
    runGroqPostGeneration(
      sourceText,
      platforms,
      extraInstructions,
      summarized,
    ),
    includeImage
      ? presetImagePrompt
        ? Promise.resolve(presetImagePrompt)
        : deriveImagePromptFromSummary(sourceText).catch((e) => {
            imagePromptDerivationError =
              e instanceof Error ? e.message : String(e);
            return null;
          })
      : Promise.resolve(null as string | null),
  ]);

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

  let sharedImage:
    | { mimeType: string; base64: string; promptUsed: string }
    | undefined;
  let imageError: string | undefined;
  if (includeImage) {
    if (!resolvedImagePrompt) {
      imageError =
        imagePromptDerivationError ??
        "Could not build an image prompt. Add a custom image prompt or try again.";
    } else {
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
