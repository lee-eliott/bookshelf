import { NextResponse } from "next/server";
import { resolveBookByIsbn } from "@/lib/book-sources";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ isbn: string }> }
) {
  const { isbn } = await params;

  const book = await resolveBookByIsbn(isbn);
  if (!book) {
    return NextResponse.json({ error: "Book not found" }, { status: 404 });
  }

  return NextResponse.json(book);
}
