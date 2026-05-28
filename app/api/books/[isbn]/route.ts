import { NextResponse } from "next/server";
import { enhanceCoverUrl } from "@/lib/utils";

interface BookResult {
  isbn: string;
  title: string;
  author: string | null;
  cover_url: string | null;
  description: string | null;
  published_year: number | null;
}

/** Check Open Library cover existence via HEAD, returns URL if found */
async function openLibraryCover(isbn: string): Promise<string | null> {
  try {
    const url = `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`;
    const res = await fetch(`${url}?default=false`, {
      method: "HEAD",
      next: { revalidate: 86400 },
    });
    return res.ok ? url : null;
  } catch {
    return null;
  }
}

async function fromGoogleBooks(isbn: string): Promise<BookResult | null> {
  try {
    const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
    const keyParam = apiKey ? `&key=${apiKey}` : "";
    const res = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&maxResults=1${keyParam}`,
      { next: { revalidate: 86400 } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.items?.length) return null;

    const { volumeInfo } = data.items[0];

    // Prefer highest-res Google Books image; fall back to Open Library if none
    const googleCover = enhanceCoverUrl(
      volumeInfo.imageLinks?.large ??
      volumeInfo.imageLinks?.medium ??
      volumeInfo.imageLinks?.thumbnail
    );
    const cover_url = googleCover ?? (await openLibraryCover(isbn));

    return {
      isbn,
      title: volumeInfo.title ?? "Titre inconnu",
      author: volumeInfo.authors?.join(", ") ?? null,
      cover_url,
      description: volumeInfo.description ?? null,
      published_year: volumeInfo.publishedDate
        ? parseInt(volumeInfo.publishedDate.split("-")[0])
        : null,
    };
  } catch {
    return null;
  }
}

async function fromOpenLibrary(isbn: string): Promise<BookResult | null> {
  try {
    const res = await fetch(
      `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`,
      { next: { revalidate: 86400 } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const entry = data[`ISBN:${isbn}`];
    if (!entry) return null;

    const coverUrl =
      enhanceCoverUrl(entry.cover?.large ?? entry.cover?.medium ?? entry.cover?.small) ??
      (await openLibraryCover(isbn));

    const publishYear = entry.publish_date
      ? parseInt(entry.publish_date.replace(/\D/g, "").slice(0, 4))
      : null;

    return {
      isbn,
      title: entry.title ?? "Titre inconnu",
      author: entry.authors?.map((a: { name: string }) => a.name).join(", ") ?? null,
      cover_url: coverUrl,
      description: entry.notes ?? null,
      published_year: isNaN(publishYear ?? NaN) ? null : publishYear,
    };
  } catch {
    return null;
  }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ isbn: string }> }
) {
  const { isbn } = await params;

  // Try Google Books first, fallback to Open Library
  const book = (await fromGoogleBooks(isbn)) ?? (await fromOpenLibrary(isbn));

  if (!book) {
    return NextResponse.json({ error: "Book not found" }, { status: 404 });
  }

  return NextResponse.json(book);
}
