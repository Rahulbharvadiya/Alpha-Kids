// RTL if the text is mostly Arabic-script characters.
export function isRtl(text: string): boolean {
  const letters = text.match(/\p{L}/gu) ?? [];
  if (!letters.length) return false;
  const rtl = letters.filter((c) => /[\u0600-\u06FF]/.test(c)).length;
  return rtl / letters.length > 0.4;
}
