export type SharedGeneratedImage = {
  mimeType: string;
  base64: string;
  promptUsed: string;
};

export type GenerateResponse = {
  posts: Record<string, string>;
  truncated: boolean;
  transcriptCharsUsed: number;
  notice?: string;
  sharedImage?: SharedGeneratedImage;
  imageError?: string;
};
