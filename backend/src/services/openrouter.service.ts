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
  return `Summarize the following transcript so another model can turn it into strong platform-specific social posts.

Requirements:
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
${transcript.trim()}
"""`;
}

export async function summarizeTranscript(
  transcript: string,
): Promise<{ summary: string; model: string }> {
  const client = getClient();
  const completion = await client.chat.completions.create({
    model: env.openRouterModel,
    messages: [
      {
        role: "system",
        content:
          "You are a faithful editorial summarizer preparing source material for downstream marketing copy generation.",
      },
      {
        role: "user",
        content: buildSummaryPrompt(transcript),
      },
    ],
    temperature: 0.3,
    max_tokens: env.openRouterMaxCompletionTokens,
  });

  const summary = completion.choices[0]?.message?.content?.trim();
  if (!summary) {
    throw new Error("Empty response from OpenRouter summarizer");
  }

  return {
    summary,
    model: env.openRouterModel,
  };
}
