import OpenAI from "openai";
import { env, requireOpenRouterKey } from "../config/env.js";

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

function getClient(): OpenAI {
  return new OpenAI({
    apiKey: requireOpenRouterKey(),
    baseURL: OPENROUTER_BASE_URL,
  });
}

function buildSummaryPrompt(transcript: string): string {
  const trimmed = transcript.trim();
  const n = trimmed.length;
  const targetCap = Math.min(
    Math.max(120, Math.floor(n * 0.38)),
    Math.max(1, n - 1),
  );

  return `Summarize the following transcript so another model can turn it into strong platform-specific social posts.

Transcript length: ${n} characters (whitespace-trimmed). Your entire reply MUST be strictly shorter than this—fewer total characters than ${n}, including headings, labels, and newlines. This is a hard constraint.

Compression:
- Aim for about ${targetCap} characters or less when the transcript is long; be aggressive—omit redundancy, merge overlapping points, and use tight phrasing.
- Never pad, restate the transcript verbatim, or quote long passages. The summary exists to shrink the source.

Content:
- Preserve the core message, major takeaways, and any memorable examples.
- Remove filler, repetition, greetings, and side tangents.
- Keep every factual claim grounded in the transcript only.
- Highlight the strongest hook angles and audience-relevant insights.
- Return plain text only.
- Structure the result exactly with these headings:
Core thesis
Key points
Notable examples or stories
Hook ideas
CTA or closing angle

Transcript:
"""
${trimmed}
"""`;
}

function buildCompressFollowUp(transcriptChars: number, tooLongSummary: string): string {
  const maxChars = Math.min(
    Math.max(80, Math.floor(transcriptChars * 0.32)),
    Math.max(1, transcriptChars - 1),
  );
  return `Your previous summary was ${tooLongSummary.length} characters, but the transcript is only ${transcriptChars} characters. Rewrite from scratch to satisfy the length rule.

Hard limit: your new reply must be at most ${maxChars} characters total (strictly fewer than ${transcriptChars}). Drop nice-to-have details if needed. Keep the same five headings but make each section very short.`;
}

export async function summarizeTranscript(
  transcript: string,
): Promise<{ summary: string; model: string }> {
  const client = getClient();
  const trimmed = transcript.trim();
  const transcriptChars = trimmed.length;

  const system =
    "You are a faithful editorial summarizer preparing compressed source material for downstream marketing copy generation. You prioritize brevity: the summary must always be shorter than the transcript in character count—never match or exceed it.";

  const completion = await client.chat.completions.create({
    model: env.openRouterModel,
    messages: [
      { role: "system", content: system },
      { role: "user", content: buildSummaryPrompt(transcript) },
    ],
    temperature: 0.3,
    max_tokens: env.openRouterMaxCompletionTokens,
  });

  let summary = completion.choices[0]?.message?.content?.trim();
  if (!summary) {
    throw new Error("Empty response from OpenRouter summarizer");
  }

  if (summary.length >= transcriptChars) {
    const retry = await client.chat.completions.create({
      model: env.openRouterModel,
      messages: [
        { role: "system", content: system },
        { role: "user", content: buildSummaryPrompt(transcript) },
        { role: "assistant", content: summary },
        { role: "user", content: buildCompressFollowUp(transcriptChars, summary) },
      ],
      temperature: 0.2,
      max_tokens: env.openRouterMaxCompletionTokens,
    });
    summary = retry.choices[0]?.message?.content?.trim();
    if (!summary) {
      throw new Error("Empty response from OpenRouter summarizer (retry)");
    }
  }

  if (summary.length >= transcriptChars) {
    throw new Error(
      "OpenRouter summary was not shorter than the transcript after retry. Try again or shorten the transcript.",
    );
  }

  return {
    summary,
    model: env.openRouterModel,
  };
}
