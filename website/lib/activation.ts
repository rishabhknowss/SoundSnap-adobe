// Generate a short, human-readable activation key like "SNAP-A3X9-K7M2"
export function generateActivationKey(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no O/0/I/1 to avoid confusion
  const segment = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `SNAP-${segment()}-${segment()}`;
}
