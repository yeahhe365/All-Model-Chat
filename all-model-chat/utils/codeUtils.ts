
export const isLikelyHtml = (textContent: string): boolean => {
  if (!textContent) return false;
  const s = textContent.trim().toLowerCase();
  return s.startsWith('<!doctype html>') || (s.includes('<html') && s.includes('</html>')) || (s.startsWith('<svg') && s.includes('</svg>'));
};
