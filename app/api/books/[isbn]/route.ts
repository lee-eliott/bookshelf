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

/** HEAD-check Open Library cover CDN — returns URL only if the image exists */
async function getOpenLibraryCover(isbn: string): Promise<string | null> {
  try {
    const url = `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`;
    const res = await fetch(`${url}?default=false`, { method: "HEAD" });
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
    const cover_url = enhanceCoverUrl(
      volumeInfo.imageLinks?.large ??
        volumeInfo.imageLinks?.medium ??
        volumeInfo.imageLinks?.thumbnail
    );

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

    const cover_url = enhanceCoverUrl(
      entry.cover?.large ?? entry.cover?.medium ?? entry.cover?.small
    );

    // `notes` is rarely a synopsis — look up the Work for a real description
    let description: string | null =
      typeof entry.notes === "string"
        ? entry.notes
        : (entry.notes?.value ?? null);

    if (!description && entry.works?.[0]?.key) {
      try {
        const workRes = await fetch(
          `https://openlibrary.org${entry.works[0].key}.json`,
          { next: { revalidate: 86400 } }
        );
        if (workRes.ok) {
          const work = await workRes.json();
          description =
            typeof work.description === "string"
              ? work.description
              : (work.description?.value ?? null);
        }
      } catch {
        /* ignore — description stays null */
      }
    }

    const publishYear = entry.publish_date
      ? parseInt(entry.publish_date.replace(/\D/g, "").slice(0, 4))
      : null;

    return {
      isbn,
      title: entry.title ?? "Titre inconnu",
      author: entry.authors?.map((a: { name: string }) => a.name).join(", ") ?? null,
      cover_url,
      description,
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

  // Fetch both sources in parallel — maximises data coverage
  const [gbBook, olBook] = await Promise.all([
    fromGoogleBooks(isbn),
    fromOpenLibrary(isbn),
  ]);

  if (!gbBook && !olBook) {
    return NextResponse.json({ error: "Book not found" }, { status: 404 });
  }

  // Prefer Google Books for title / author / year; fill gaps from Open Library
  const primary = gbBook ?? olBook!;
  const fallback = gbBook ? olBook : null;

  // Cover: GB first → OL data API → direct OL cover CDN as last resort
  const cover_url =
    primary.cover_url ??
    fallback?.cover_url ??
    (await getOpenLibraryCover(isbn));

  const book: BookResult = {
    isbn: primary.isbn,
    title: primary.title,
    author: primary.author ?? fallback?.author ?? null,
    cover_url,
    description: primary.description ?? fallback?.description ?? null,
    published_year: primary.published_year ?? fallback?.published_year ?? null,
  };

  return NextResponse.json(book);
}
