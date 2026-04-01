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
});

export type GenerateRequestDto = z.infer<typeof generateRequestSchema>;

export type GenerateResponseDto = {
  posts: Record<string, string>;
  truncated: boolean;
  transcriptCharsUsed: number;
  notice?: string;
  summary: string;
  summaryModel: string;
  summarized: boolean;
};
