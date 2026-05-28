import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
  const keyParam = apiKey ? `?key=${apiKey}` : "";

  try {
    const res = await fetch(
      `https://www.googleapis.com/books/v1/volumes/${encodeURIComponent(id)}${keyParam}`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const data = await res.json();
    if (data.error) {
      return NextResponse.json(
        { error: data.error.message },
        { status: data.error.code ?? 500 }
      );
    }
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Erreur réseau" }, { status: 500 });
  }
}
