/** Platform ids supported by the MVP (must match frontend). */
export const PLATFORM_IDS = [
  "twitter",
  "linkedin",
  "newsletter",
  "instagram",
] as const;

export type PlatformId = (typeof PLATFORM_IDS)[number];

export function isPlatformId(value: string): value is PlatformId {
  return (PLATFORM_IDS as readonly string[]).includes(value);
}
