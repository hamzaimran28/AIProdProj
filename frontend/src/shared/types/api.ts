export type GenerateResponse = {
  posts: Record<string, string>;
  truncated: boolean;
  transcriptCharsUsed: number;
  notice?: string;
};
