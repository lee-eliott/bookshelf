"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useTransitionRouter } from "next-view-transitions";
import { createClient } from "@/lib/supabase/client";
import { enhanceCoverUrl } from "@/lib/utils";
import type { Book, BookInfo } from "@/lib/types";

interface GoogleBook {
  id: string;
  volumeInfo: {
    title: string;
    authors?: string[];
    description?: string;
    publishedDate?: string;
    imageLinks?: { thumbnail?: string; smallThumbnail?: string };
    industryIdentifiers?: { type: string; identifier: string }[];
  };
}

function toBookInfo(gb: GoogleBook): BookInfo {
  const v = gb.volumeInfo;
  const isbnObj = v.industryIdentifiers?.find(
    (i) => i.type === "ISBN_13" || i.type === "ISBN_10"
  );
  return {
    isbn: isbnObj?.identifier ?? gb.id,
    title: v.title,
    author: v.authors?.join(", ") ?? null,
    cover_url: enhanceCoverUrl(v.imageLinks?.thumbnail),
    description: v.description ?? null,
    published_year: v.publishedDate ? parseInt(v.publishedDate) : null,
  };
}

export default function AuthorPage() {
  const { name } = useParams<{ name: string }>();
  const authorName = decodeURIComponent(name);
  const router = useTransitionRouter();

  const [libraryBooks, setLibraryBooks] = useState<Book[]>([]);
  const [googleBooks, setGoogleBooks] = useState<GoogleBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<Record<string, "library" | "wishlist">>({});
  const [ownedIsbns, setOwnedIsbns] = useState<Record<string, string>>({});
  const [wishIsbns, setWishIsbns] = useState<Set<string>>(new Set());

  useEffect(() => {
    const supabase = createClient();

    Promise.all([
      // 1. Google Books — loose search, filtered client-side for exact name match
      fetch(`/api/books/search?q=${encodeURIComponent(`inauthor:${authorName}`)}`)
        .then((r) => r.json())
        .catch(() => ({ items: [] })),

      // 2. Supabase — user's own books + ownership maps
      supabase.auth.getUser().then(async ({ data: { user } }) => {
        if (!user) return { libBooks: [] as Book[], owned: {} as Record<string, string>, wish: new Set<string>() };

        const [allBooksRes, wishRes, authorBooksRes] = await Promise.all([
          supabase.from("books").select("id, isbn"),
          supabase.from("wishlist").select("isbn"),
          // Books in the library where the author field contains this author's name
          supabase.from("books").select("*").ilike("author", `%${authorName}%`),
        ]);

        const owned: Record<string, string> = {};
        allBooksRes.data?.forEach((b) => { if (b.isbn) owned[b.isbn] = b.id; });

        const wish = new Set<string>(
          (wishRes.data ?? []).map((w) => w.isbn).filter(Boolean) as string[]
        );

        return {
          libBooks: (authorBooksRes.data ?? []) as Book[],
          owned,
          wish,
        };
      }),
    ]).then(([gbData, { libBooks, owned, wish }]) => {
      setOwnedIsbns(owned);
      setWishIsbns(wish);
      setLibraryBooks(libBooks);

      // Filter Google Books: exact author name match (case-insensitive) + not already in library
      const target = authorName.trim().toLowerCase();
      const libIsbns = new Set(libBooks.map((b) => b.isbn).filter(Boolean) as string[]);

      const gbItems: GoogleBook[] = gbData.items ?? [];
      const filtered = gbItems.filter((gb) => {
        const hasExactAuthor = gb.volumeInfo.authors?.some(
          (a) => a.trim().toLowerCase() === target
        );
        if (!hasExactAuthor) return false;
        // Skip duplicates already in library
        const info = toBookInfo(gb);
        return !info.isbn || !libIsbns.has(info.isbn);
      });

      setGoogleBooks(filtered);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [authorName]);

  const save = async (gb: GoogleBook, dest: "library" | "wishlist") => {
    setSaving(gb.id);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    const info = toBookInfo(gb);
    const table = dest === "library" ? "books" : "wishlist";
    const payload =
      dest === "library"
        ? { ...info, status: "owned", user_id: user.id }
        : { ...info, user_id: user.id };

    const { data: inserted } = await supabase.from(table).insert(payload).select("id").single();

    if (dest === "library" && info.isbn && wishIsbns.has(info.isbn)) {
      await supabase.from("wishlist").delete().eq("isbn", info.isbn);
      setWishIsbns((prev) => { const n = new Set(prev); n.delete(info.isbn!); return n; });
    }

    if (info.isbn) {
      if (dest === "library" && inserted?.id) {
        setOwnedIsbns((prev) => ({ ...prev, [info.isbn!]: inserted.id }));
      } else if (dest === "wishlist") {
        setWishIsbns((prev) => new Set([...prev, info.isbn!]));
      }
    }

    setSaved((prev) => ({ ...prev, [gb.id]: dest }));
    setSaving(null);
  };

  const initials = authorName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const totalCount = libraryBooks.length + googleBooks.length;

  return (
    <div className="max-w-lg mx-auto">
      {/* ── Header ── */}
      <div className="px-4 pt-14 pb-6 animate-fade-up">
        <button
          onClick={() => router.back()}
          className="mb-5 flex items-center gap-1.5 text-stone-400 text-sm font-medium active:text-stone-600 transition-colors"
        >
          <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} className="w-4 h-4">
            <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Retour
        </button>

        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0">
            <span className="text-amber-700 font-bold text-xl">{initials}</span>
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-amber-700 tracking-widest uppercase mb-1">
              Auteur
            </p>
            <h1 className="text-2xl font-bold text-stone-900 leading-tight">{authorName}</h1>
            {!loading && (
              <p className="text-stone-400 text-sm mt-0.5">
                {totalCount} œuvre{totalCount > 1 ? "s" : ""} trouvée{totalCount > 1 ? "s" : ""}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Loading ── */}
      {loading && (
        <div className="flex justify-center py-16 animate-fade-in">
          <div className="w-7 h-7 border-2 border-amber-700 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* ── Content ── */}
      {!loading && (
        <div className="px-4 pb-10 space-y-6">

          {/* Empty state */}
          {totalCount === 0 && (
            <div className="flex flex-col items-center py-16 text-center gap-3 animate-fade-in">
              <div className="w-14 h-14 bg-stone-100 rounded-2xl flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.3} className="w-7 h-7 text-stone-300">
                  <path d="M8 3H5a2 2 0 00-2 2v14a2 2 0 002 2h3M8 3v18M8 3h8a2 2 0 012 2v14a2 2 0 01-2 2H8" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M16 3h3a2 2 0 012 2v14a2 2 0 01-2 2h-3" stroke="currentColor" strokeLinecap="round" />
                </svg>
              </div>
              <p className="text-stone-500 text-sm">Aucune œuvre trouvée pour cet auteur</p>
            </div>
          )}

          {/* ── Library books (always reliable) ── */}
          {libraryBooks.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-3">
                Dans ta bibliothèque
              </p>
              <div className="space-y-2.5">
                {libraryBooks.map((book, i) => {
                  const coverUrl = enhanceCoverUrl(book.cover_url);
                  return (
                    <button
                      key={book.id}
                      onClick={() => router.push(`/book/${book.id}`)}
                      className="bg-white rounded-2xl p-3.5 border border-stone-100/80 flex gap-3.5 w-full text-left animate-fade-up hover:bg-stone-50/80 hover:shadow-[0_4px_20px_rgba(0,0,0,0.09)] hover:-translate-y-px active:scale-[0.98] transition-all duration-150"
                      style={{ animationDelay: `${i * 40}ms`, boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
                    >
                      <div className="relative w-12 shrink-0" style={{ aspectRatio: "2/3" }}>
                        {coverUrl ? (
                          <Image src={coverUrl} alt={book.title} fill className="object-cover rounded-lg" sizes="48px" />
                        ) : (
                          <div className="w-full h-full rounded-lg bg-gradient-to-br from-amber-50 to-stone-100 flex items-center justify-center">
                            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-amber-300" strokeWidth={1.2}>
                              <path d="M8 3H5a2 2 0 00-2 2v14a2 2 0 002 2h3M8 3v18M8 3h8a2 2 0 012 2v14a2 2 0 01-2 2H8" stroke="currentColor" strokeLinecap="round" />
                              <path d="M16 3h3a2 2 0 012 2v14a2 2 0 01-2 2h-3" stroke="currentColor" strokeLinecap="round" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-stone-900 text-[13px] leading-snug line-clamp-2">{book.title}</p>
                        {book.published_year && (
                          <p className="text-stone-300 text-[11px] mt-0.5">{book.published_year}</p>
                        )}
                        <span className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-bold text-amber-700">
                          <svg viewBox="0 0 24 24" fill="none" className="w-3 h-3" strokeWidth={2.5}>
                            <path d="M9 12l2 2 4-4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
                            <circle cx="12" cy="12" r="9" stroke="currentColor" />
                          </svg>
                          Dans ta bibliothèque
                        </span>
                      </div>
                      <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} className="w-4 h-4 text-stone-300 self-center shrink-0">
                        <path d="M9 18l6-6-6-6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Google Books discovery ── */}
          {googleBooks.length > 0 && (
            <div>
              {libraryBooks.length > 0 && (
                <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-3">
                  Autres œuvres
                </p>
              )}
              <div className="space-y-2.5">
                {googleBooks.map((gb, i) => {
                  const v = gb.volumeInfo;
                  const coverUrl = v.imageLinks?.thumbnail?.replace("http:", "https:");
                  const info = toBookInfo(gb);
                  const isbn = info.isbn ?? "";

                  const justSaved = saved[gb.id];
                  const inLibrary = !justSaved && isbn && ownedIsbns[isbn];
                  const inWishlist = !justSaved && !inLibrary && isbn && wishIsbns.has(isbn);

                  return (
                    <div
                      key={gb.id}
                      onClick={() => router.push(`/book/preview/${gb.id}`)}
                      className="bg-white rounded-2xl p-3.5 border border-stone-100/80 flex gap-3.5 animate-fade-up cursor-pointer hover:bg-stone-50/80 hover:shadow-[0_4px_20px_rgba(0,0,0,0.09)] hover:-translate-y-px active:scale-[0.99] transition-all duration-150"
                      style={{ animationDelay: `${(libraryBooks.length + i) * 40}ms`, boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
                    >
                      <div className="relative w-12 shrink-0 rounded-lg overflow-hidden" style={{ aspectRatio: "2/3" }}>
                        {coverUrl ? (
                          <Image src={coverUrl} alt={v.title} fill className="object-cover" sizes="48px" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-amber-50 to-stone-100 flex items-center justify-center">
                            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-amber-300" strokeWidth={1.2}>
                              <path d="M8 3H5a2 2 0 00-2 2v14a2 2 0 002 2h3M8 3v18M8 3h8a2 2 0 012 2v14a2 2 0 01-2 2H8" stroke="currentColor" strokeLinecap="round" />
                              <path d="M16 3h3a2 2 0 012 2v14a2 2 0 01-2 2h-3" stroke="currentColor" strokeLinecap="round" />
                            </svg>
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-stone-900 text-[13px] leading-snug line-clamp-2">{v.title}</p>
                        {v.publishedDate && (
                          <p className="text-stone-300 text-[11px] mt-0.5">{v.publishedDate.slice(0, 4)}</p>
                        )}

                        {/* Actions — stopPropagation pour ne pas déclencher la navigation */}
                        <div onClick={(e) => e.stopPropagation()}>
                          {inLibrary && (
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-[11px] font-bold text-amber-700 flex items-center gap-1">
                                <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5" strokeWidth={2.5}>
                                  <path d="M9 12l2 2 4-4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
                                  <circle cx="12" cy="12" r="9" stroke="currentColor" />
                                </svg>
                                Dans ta bibliothèque
                              </span>
                              <button onClick={() => router.push(`/book/${inLibrary}`)} className="text-[11px] font-bold text-amber-600 underline underline-offset-2 ml-2 shrink-0">
                                Voir →
                              </button>
                            </div>
                          )}

                          {inWishlist && (
                            <div className="mt-2 space-y-1.5">
                              <span className="text-[11px] font-bold text-amber-700 flex items-center gap-1">
                                <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5" strokeWidth={2.5}>
                                  <path d="M9 12l2 2 4-4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
                                  <circle cx="12" cy="12" r="9" stroke="currentColor" />
                                </svg>
                                Dans ta wishlist
                              </span>
                              <button onClick={() => save(gb, "library")} disabled={saving === gb.id} className="w-full bg-amber-700 text-white py-1.5 rounded-lg text-[11px] font-bold disabled:opacity-40 active:scale-95 transition-transform">
                                {saving === gb.id ? "…" : "Ajouter à ma bibliothèque"}
                              </button>
                            </div>
                          )}

                          {justSaved && (
                            <p className="mt-2 text-[11px] font-bold text-green-600 tracking-wide flex items-center gap-1">
                              <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5" strokeWidth={2.5}>
                                <path d="M9 12l2 2 4-4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
                                <circle cx="12" cy="12" r="9" stroke="currentColor" />
                              </svg>
                              {justSaved === "library" ? "Ajouté à la bibliothèque" : "Ajouté à la wishlist"}
                            </p>
                          )}

                          {!inLibrary && !inWishlist && !justSaved && (
                            <div className="flex gap-1.5 mt-2.5">
                              <button onClick={() => save(gb, "library")} disabled={saving === gb.id} className="flex-1 bg-amber-700 text-white py-1.5 rounded-lg text-[11px] font-bold disabled:opacity-40 active:scale-95 transition-transform">
                                {saving === gb.id ? "…" : "Ma bibliothèque"}
                              </button>
                              <button onClick={() => save(gb, "wishlist")} disabled={saving === gb.id} className="flex-1 border border-stone-200 text-stone-600 py-1.5 rounded-lg text-[11px] font-bold disabled:opacity-40 active:scale-95 transition-transform">
                                Wishlist
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
