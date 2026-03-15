import { useState } from 'react';
import { getAvatarUrl } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface ProfileAvatarProps {
  avatarUrl: string | null | undefined;
  seed?: string;
  className?: string;
  alt?: string;
}

/**
 * Profile image that never breaks: tries avatar_url first, falls back to DiceBear
 * character avatar on load error (stops flicker and broken image).
 */
export function ProfileAvatar({ avatarUrl, seed, className, alt = '' }: ProfileAvatarProps) {
  const [useFallback, setUseFallback] = useState(false);
  const effectiveUrl = useFallback ? getAvatarUrl(null, seed) : getAvatarUrl(avatarUrl, seed);

  return (
    <img
      src={effectiveUrl}
      alt={alt}
      className={cn('rounded-full object-cover', className)}
      onError={() => setUseFallback(true)}
    />
  );
}
