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

// ─── XML helpers (no dependency needed for BnF Dublin Core) ───────────────────

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

/** First text content of a (possibly namespaced) XML tag */
function xmlFirst(xml: string, localName: string): string | null {
  const re = new RegExp(
    `<(?:[\\w]+:)?${localName}(?:\\s[^>]*)?>([\\s\\S]*?)</(?:[\\w]+:)?${localName}>`,
    "i"
  );
  const m = xml.match(re);
  if (!m) return null;
  const val = decodeXmlEntities(
    m[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
  );
  return val || null;
}

/** All text contents of a (possibly namespaced) XML tag */
function xmlAll(xml: string, localName: string): string[] {
  const re = new RegExp(
    `<(?:[\\w]+:)?${localName}(?:\\s[^>]*)?>([\\s\\S]*?)</(?:[\\w]+:)?${localName}>`,
    "gi"
  );
  const results: string[] = [];
  let m;
  while ((m = re.exec(xml)) !== null) {
    const val = decodeXmlEntities(
      m[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
    );
    if (val) results.push(val);
  }
  return results;
}

// ─── Cover helpers ────────────────────────────────────────────────────────────

/** HEAD-check Open Library cover CDN — URL only if the image exists */
async function getOpenLibraryCover(isbn: string): Promise<string | null> {
  try {
    const url = `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`;
    const res = await fetch(`${url}?default=false`, { method: "HEAD" });
    return res.ok ? url : null;
  } catch {
    return null;
  }
}

/** HEAD-check BnF cover CDN given an ARK identifier */
async function getBnFCover(arkId: string): Promise<string | null> {
  try {
    const url = `https://catalogue.bnf.fr/couverture?appName=NE&idArk=${encodeURIComponent(arkId)}&couverture=1`;
    const res = await fetch(url, { method: "HEAD" });
    return res.ok ? url : null;
  } catch {
    return null;
  }
}

// ─── Source fetchers ──────────────────────────────────────────────────────────

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

    // `notes` field is rarely a synopsis — look up the linked Work for a real description
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
        /* ignore */
      }
    }

    const publishYear = entry.publish_date
      ? parseInt(entry.publish_date.replace(/\D/g, "").slice(0, 4))
      : null;

    return {
      isbn,
      title: entry.title ?? "Titre inconnu",
      author:
        entry.authors?.map((a: { name: string }) => a.name).join(", ") ?? null,
      cover_url,
      description,
      published_year: isNaN(publishYear ?? NaN) ? null : publishYear,
    };
  } catch {
    return null;
  }
}

async function fromBnF(isbn: string): Promise<BookResult | null> {
  try {
    const query = encodeURIComponent(`bib.isbn adj "${isbn}"`);
    const res = await fetch(
      `https://catalogue.bnf.fr/api/SRU?version=1.2&operation=searchRetrieve&query=${query}&recordSchema=dublincore&maximumRecords=1`,
      { next: { revalidate: 86400 } }
    );
    if (!res.ok) return null;
    const xml = await res.text();

    if (xmlFirst(xml, "numberOfRecords") === "0") return null;

    // Title — BnF sometimes appends "[Texte imprimé]" etc.
    const rawTitle = xmlFirst(xml, "title");
    if (!rawTitle) return null;
    const title = rawTitle.replace(/\s*\[[^\]]*\]\s*/g, "").trim() || rawTitle;

    // Authors — BnF format: "Nom, Prénom (1961-.... ; Auteur du texte)"
    const authors = xmlAll(xml, "creator")
      .map((c) => c.replace(/\s*\([^)]*\)/g, "").trim())
      .filter(Boolean);
    const author = authors.length > 0 ? authors.join(", ") : null;

    // Description — may start with "Résumé : "
    const rawDesc = xmlFirst(xml, "description");
    const description = rawDesc
      ? rawDesc.replace(/^R[eé]sum[eé]\s*:\s*/i, "").trim()
      : null;

    // Year
    const dateStr = xmlFirst(xml, "date");
    const published_year = dateStr
      ? parseInt(dateStr.replace(/\D/g, "").slice(0, 4))
      : null;

    // Cover via ARK identifier
    const identifiers = xmlAll(xml, "identifier");
    const arkId = identifiers.find((id) => id.startsWith("ark:/"));
    const cover_url = arkId ? await getBnFCover(arkId) : null;

    return {
      isbn,
      title,
      author,
      cover_url,
      description,
      published_year: isNaN(published_year ?? NaN) ? null : published_year,
    };
  } catch {
    return null;
  }
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ isbn: string }> }
) {
  const { isbn } = await params;

  // All three sources fetched in parallel
  const [gbBook, olBook, bnfBook] = await Promise.all([
    fromGoogleBooks(isbn),
    fromOpenLibrary(isbn),
    fromBnF(isbn),
  ]);

  if (!gbBook && !olBook && !bnfBook) {
    return NextResponse.json({ error: "Book not found" }, { status: 404 });
  }

  // Cover: GB → OL data API → OL CDN HEAD → BnF (already HEAD-checked inside fromBnF)
  const cover_url =
    gbBook?.cover_url ??
    olBook?.cover_url ??
    (await getOpenLibraryCover(isbn)) ??
    bnfBook?.cover_url ??
    null;

  // Each field: first non-null in order GB > OL > BnF
  const book: BookResult = {
    isbn,
    title:
      gbBook?.title ?? olBook?.title ?? bnfBook?.title ?? "Titre inconnu",
    author:
      gbBook?.author ?? olBook?.author ?? bnfBook?.author ?? null,
    cover_url,
    description:
      gbBook?.description ?? olBook?.description ?? bnfBook?.description ?? null,
    published_year:
      gbBook?.published_year ?? olBook?.published_year ?? bnfBook?.published_year ?? null,
  };

  return NextResponse.json(book);
}
