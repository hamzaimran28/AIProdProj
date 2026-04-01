export type GenerateResponse = {
  posts: Record<string, string>;
  truncated: boolean;
  transcriptCharsUsed: number;
  notice?: string;
  summary: string;
  summaryModel: string;
  summarized: boolean;
};
