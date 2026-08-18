import { NextRequest, NextResponse } from "next/server";
import { fetchGoogleBooks } from "@/lib/google-books";
import { searchOpenLibrary } from "@/lib/open-library";

/** Google Books uses `inauthor:`, Open Library uses `author:`. */
function toOpenLibraryQuery(q: string): string {
  return q.replace(/\binauthor:/g, "author:");
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q");
  if (!q || q.trim().length < 2) {
    return NextResponse.json({ items: [] });
  }

  // ── Primary source: Google Books ──
  try {
    const res = await fetchGoogleBooks("volumes", { q, maxResults: 20 }, 60);
    const data = await res.json();

    if (res.ok && !data.error) {
      return NextResponse.json({ items: data.items ?? [], source: "google" });
    }
    console.error("[Books search] Google failed:", res.status, data.error?.message);
  } catch (err) {
    console.error("[Books search] Google fetch error:", err);
  }

  // ── Fallback: Open Library ──
  // Google Books returns transient 503s in bursts that outlast our retries,
  // so a second source is what actually keeps search usable.
  try {
    const items = await searchOpenLibrary(toOpenLibraryQuery(q));
    return NextResponse.json({ items, source: "openlibrary" });
  } catch (err) {
    console.error("[Books search] Open Library fetch error:", err);
    return NextResponse.json(
      { error: "Les catalogues sont momentanément indisponibles." },
      { status: 502 }
    );
  }
}
