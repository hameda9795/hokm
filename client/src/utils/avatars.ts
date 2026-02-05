// Avatar utilities for player display

// Available avatar count
export const AVATAR_COUNT = 8;

// Get avatar path by index (1-8)
export const getAvatarPath = (index: number): string => {
  const safeIndex = ((index - 1) % AVATAR_COUNT) + 1;
  return `/avatars/avatar_${safeIndex}.svg`;
};

// Get bot avatar path
export const getBotAvatarPath = (): string => {
  return '/avatars/bot_avatar.svg';
};

// Get avatar for a player based on their position or ID
export const getPlayerAvatar = (_playerId: string, position: number, isBot: boolean): string => {
  if (isBot) {
    return getBotAvatarPath();
  }
  // Use position + 1 as avatar index (positions are 0-3)
  return getAvatarPath(position + 1);
};

// Generate a consistent avatar index from player ID
export const getAvatarIndexFromId = (playerId: string): number => {
  let hash = 0;
  for (let i = 0; i < playerId.length; i++) {
    const char = playerId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return (Math.abs(hash) % AVATAR_COUNT) + 1;
};
