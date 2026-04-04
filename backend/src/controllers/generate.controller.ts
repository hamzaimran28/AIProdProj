import type { Request, Response } from "express";
import { env } from "../config/env.js";
import { generateRequestSchema } from "../models/generate.dto.js";
import { generatePostsFromTranscript } from "../services/groq.service.js";

export async function postGenerate(req: Request, res: Response): Promise<void> {
  const parsed = generateRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((e) => e.message).join("; ");
    res.status(400).json({ error: msg });
    return;
  }

  const { transcript, platforms, extraInstructions, includeImage, imagePrompt } =
    parsed.data;

  if (includeImage && !env.huggingfaceApiToken) {
    res.status(400).json({
      error:
        "Image generation is enabled but HUGGINGFACE_API_TOKEN is not set on the server.",
    });
    return;
  }

  try {
    const result = await generatePostsFromTranscript(
      transcript,
      platforms,
      extraInstructions,
      {
        includeImage: includeImage === true,
        imagePrompt,
      },
    );
    res.json({
      posts: result.posts,
      truncated: result.truncated,
      transcriptCharsUsed: result.transcriptCharsUsed,
      notice: result.notice,
      sharedImage: result.sharedImage,
      imageError: result.imageError,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Generation failed";
    res.status(502).json({ error: message });
  }
}
