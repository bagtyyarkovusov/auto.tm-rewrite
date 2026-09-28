/**
 * Renders the inline markup the legal documents use: `**bold**`, `` `code` ``
 * and `[text](/internal/path)`. Only site-relative links are recognised; the
 * documents are static, trusted content.
 */
export function inlineMarkupToHtml(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(
      /\[([^\]]+)\]\((\/[^)\s]*)\)/g,
      '<a href="$2" class="underline underline-offset-4 print:no-underline">$1</a>',
    );
}
