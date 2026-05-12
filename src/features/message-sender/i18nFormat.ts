export const formatMessageSenderText = (template: string, replacements: Record<string, string | number>): string =>
  Object.entries(replacements).reduce((text, [key, value]) => text.replaceAll(`{${key}}`, String(value)), template);
