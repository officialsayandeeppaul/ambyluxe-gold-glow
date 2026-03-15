import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Profile image URL: use provided avatar_url or DiceBear comic-style avatar fallback (e.g. after Google login with no image). */
export function getAvatarUrl(
  avatarUrl: string | null | undefined,
  seed?: string
): string {
  if (avatarUrl?.trim()) return avatarUrl;
  const s = (seed || "user").trim();
  return `https://api.dicebear.com/9.x/lorelei/svg?seed=${encodeURIComponent(s)}`;
}
