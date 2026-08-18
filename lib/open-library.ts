/**
 * Open Library search, used as a fallback when Google Books is unavailable.
 * Results are shaped like Google Books volumes so the UI stays source-agnostic.
 */

interface OpenLibraryDoc {
  title?: string;
  author_name?: string[];
  first_publish_year?: number;
  isbn?: string[];
  cover_i?: number;
}

export interface VolumeLike {
  id: string;
  volumeInfo: {
    title: string;
    authors?: string[];
    description?: string;
    publishedDate?: string;
    imageLinks?: { thumbnail?: string };
    industryIdentifiers?: { type: string; identifier: string }[];
  };
}

/** Prefer a modern ISBN-13; fall back to any ISBN-10. */
function pickIsbn(isbns: string[] | undefined): string | null {
  if (!isbns?.length) return null;
  return (
    isbns.find((i) => /^97[89]\d{10}$/.test(i)) ??
    isbns.find((i) => /^\d{9}[\dXx]$/.test(i)) ??
    null
  );
}

function toVolumeLike(doc: OpenLibraryDoc): VolumeLike | null {
  if (!doc.title) return null;

  // An ISBN is what makes a result actionable: the detail page re-resolves the
  // book from it, and saving dedupes against the library on it. Editions
  // without one are dropped rather than surfaced as dead ends.
  const isbn = pickIsbn(doc.isbn);
  if (!isbn) return null;

  return {
    id: `isbn:${isbn}`,
    volumeInfo: {
      title: doc.title,
      authors: doc.author_name,
      publishedDate: doc.first_publish_year
        ? String(doc.first_publish_year)
        : undefined,
      imageLinks: doc.cover_i
        ? { thumbnail: `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` }
        : undefined,
      industryIdentifiers: [
        { type: isbn.length === 13 ? "ISBN_13" : "ISBN_10", identifier: isbn },
      ],
    },
  };
}

export async function searchOpenLibrary(
  q: string,
  limit = 20
): Promise<VolumeLike[]> {
  const url = new URL("https://openlibrary.org/search.json");
  url.searchParams.set("q", q);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set(
    "fields",
    "title,author_name,first_publish_year,isbn,cover_i"
  );

  const res = await fetch(url.toString(), { next: { revalidate: 60 } });
  if (!res.ok) throw new Error(`Open Library ${res.status}`);

  const data = await res.json();
  return ((data.docs ?? []) as OpenLibraryDoc[])
    .map(toVolumeLike)
    .filter((v): v is VolumeLike => v !== null);
}
