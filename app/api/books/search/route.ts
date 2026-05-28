import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q");
  if (!q || q.trim().length < 2) {
    return NextResponse.json({ items: [] });
  }

  const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
  const keyParam = apiKey ? `&key=${apiKey}` : "";

  const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=20${keyParam}`;

  try {
    const res = await fetch(url, { next: { revalidate: 60 } });
    const data = await res.json();

    if (data.error) {
      console.error("[Books search] API error:", data.error);
      return NextResponse.json(
        { error: data.error.message, code: data.error.code },
        { status: data.error.code ?? 500 }
      );
    }

    return NextResponse.json({ items: data.items ?? [] });
  } catch (err) {
    console.error("[Books search] Fetch error:", err);
    return NextResponse.json({ error: "Erreur réseau" }, { status: 500 });
  }
}
