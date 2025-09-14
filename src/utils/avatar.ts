export const getFallbackAvatar = (seed?: string) =>
  `https://api.dicebear.com/7.x/identicon/svg?seed=${seed || Math.random()}`;
