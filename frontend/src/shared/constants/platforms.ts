/** Must match backend `platformSchema` */
export const PLATFORM_OPTIONS = [
  { id: "twitter", label: "X (Twitter) thread" },
  { id: "linkedin", label: "LinkedIn post" },
  { id: "newsletter", label: "Newsletter teaser" },
  { id: "instagram", label: "Instagram caption" },
] as const;

export type PlatformId = (typeof PLATFORM_OPTIONS)[number]["id"];
