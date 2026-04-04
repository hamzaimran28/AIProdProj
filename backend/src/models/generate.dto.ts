import { z } from "zod";

const platformSchema = z.enum([
  "twitter",
  "linkedin",
  "newsletter",
  "instagram",
]);

export const generateRequestSchema = z.object({
  transcript: z
    .string()
    .min(100, "Transcript must be at least 100 characters")
    .max(120_000, "Transcript too long"),
  platforms: z.array(platformSchema).min(1, "Select at least one platform").max(4),
  extraInstructions: z.string().max(500).optional(),
  /** When true, generates one image shared by all platforms (same asset in the response). */
  includeImage: z.boolean().optional(),
  /** Optional FLUX prompt; if omitted with includeImage, a prompt is inferred from the transcript summary. */
  imagePrompt: z.string().min(1).max(2000).optional(),
});

export type GenerateRequestDto = z.infer<typeof generateRequestSchema>;

export type SharedGeneratedImageDto = {
  mimeType: string;
  base64: string;
  promptUsed: string;
};

export type GenerateResponseDto = {
  posts: Record<string, string>;
  truncated: boolean;
  transcriptCharsUsed: number;
  notice?: string;
  summary: string;
  summaryModel: string;
  summarized: boolean;
  /** Single image for the whole batch; reuse this same payload for every platform in the UI. */
  sharedImage?: SharedGeneratedImageDto;
  imageError?: string;
};
