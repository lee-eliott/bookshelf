import { NextResponse } from "next/server";
import { fetchGoogleBooks } from "@/lib/google-books";
import { resolveBookByIsbn, type BookResult } from "@/lib/book-sources";

/** Reshapes a multi-source result into the Google volume shape the UI expects. */
function toVolume(book: BookResult, id: string) {
  return {
    id,
    volumeInfo: {
      title: book.title,
      authors: book.author ? book.author.split(", ") : undefined,
      description: book.description ?? undefined,
      publishedDate: book.published_year ? String(book.published_year) : undefined,
      imageLinks: book.cover_url ? { thumbnail: book.cover_url } : undefined,
      industryIdentifiers: [
        { type: book.isbn.length === 13 ? "ISBN_13" : "ISBN_10", identifier: book.isbn },
      ],
    },
  };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Search results served by the Open Library fallback carry an `isbn:` id
  // instead of a Google volume id — resolve those across all sources.
  if (id.startsWith("isbn:")) {
    const book = await resolveBookByIsbn(id.slice(5));
    if (!book) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(toVolume(book, id));
  }

  try {
    const res = await fetchGoogleBooks(`volumes/${encodeURIComponent(id)}`, {}, 3600);
    if (res.status === 404) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const data = await res.json();

    if (!res.ok || data.error) {
      console.error("[Books volume] API error:", res.status, data.error);
      return NextResponse.json(
        { error: data.error?.message ?? "Google Books indisponible" },
        { status: res.status >= 500 ? 502 : res.status }
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("[Books volume] Fetch error:", err);
    return NextResponse.json({ error: "Erreur réseau" }, { status: 502 });
  }
}
