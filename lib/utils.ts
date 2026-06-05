/**
 * Converts an HTML string to clean plain text.
 * Block-level tags become newlines; inline tags are stripped; HTML entities decoded.
 */
export function stripHtml(html: string | null | undefined): string | null {
  if (!html) return null;
  return html
    .replace(/<\/?(p|br|div|li|tr|blockquote|h[1-6])\b[^>]*>/gi, "\n") // block → newline
    .replace(/<[^>]+>/g, "")                                             // strip remaining tags
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/\n{3,}/g, "\n\n")                                          // max 2 consecutive newlines
    .trim() || null;
}

/**
 * Enhances a Google Books or Open Library cover URL for better resolution.
 * Google Books thumbnails default to zoom=1 (~128px) with a curl effect.
 * zoom=0 returns a much larger source image; removing edge=curl makes it cleaner.
 */
export function enhanceCoverUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  let enhanced = url.replace("http:", "https:");

  if (enhanced.includes("books.google.com") || enhanced.includes("googleapis.com")) {
    enhanced = enhanced
      .replace(/zoom=\d/, "zoom=0")
      .replace("&edge=curl", "");
  }

  // Open Library: prefer large over medium/small
  if (enhanced.includes("covers.openlibrary.org")) {
    enhanced = enhanced.replace(/-S\.jpg/i, "-L.jpg").replace(/-M\.jpg/i, "-L.jpg");
  }

  return enhanced;
}
