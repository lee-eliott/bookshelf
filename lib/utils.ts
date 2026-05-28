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
