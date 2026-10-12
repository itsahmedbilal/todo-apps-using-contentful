const SENTINEL = /^⟦[^⟧\s]+⟧$/;
const HAS_WORD_CHARACTER = /[\p{L}\p{N}]/u;
const TEXT_ATTRIBUTES = ['aria-label', 'alt', 'title', 'placeholder'] as const;

function isManaged(text: string, allowed: readonly string[]): boolean {
  if (allowed.includes(text)) return true;
  // Punctuation or symbols alone (for example a decorative separator) are not wording.
  if (!HAS_WORD_CHARACTER.test(text)) return true;
  return text
    .split(/\s+/)
    .every((token) => SENTINEL.test(token) || !HAS_WORD_CHARACTER.test(token));
}

/**
 * Fails if the rendered element shows any wording that is not a fixture sentinel. Components in tests
 * are fed sentinel content, so anything else on screen is a hard-coded string (constitution, Principle II).
 *
 * @param allowed exact strings that are expected, for example the single fallback message
 */
export function assertNoLiteralText(root: Element, allowed: readonly string[] = []): void {
  const offenders: string[] = [];

  const walker = root.ownerDocument.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const parent = node.parentElement?.tagName;
    if (parent === 'SCRIPT' || parent === 'STYLE') continue;
    const text = (node.nodeValue ?? '').replace(/\s+/g, ' ').trim();
    if (text && !isManaged(text, allowed)) offenders.push(`text "${text}"`);
  }

  for (const element of [root, ...Array.from(root.querySelectorAll('*'))]) {
    for (const name of TEXT_ATTRIBUTES) {
      const value = element.getAttribute(name)?.trim();
      if (value && !isManaged(value, allowed)) {
        offenders.push(`${name}="${value}" on <${element.tagName.toLowerCase()}>`);
      }
    }
  }

  if (offenders.length > 0) {
    throw new Error(
      `Literal UI text found instead of managed content:\n  ${offenders.join('\n  ')}`,
    );
  }
}
