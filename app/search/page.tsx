"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { enhanceCoverUrl } from "@/lib/utils";
import type { BookInfo } from "@/lib/types";

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

type SearchMode = "title" | "author";

export default function SearchPage() {
  const router = useRouter();
  const [mode, setMode] = useState<SearchMode>("title");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GoogleBook[]>([]);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<Record<string, "library" | "wishlist">>({});

  const [ownedIsbns, setOwnedIsbns] = useState<Record<string, string>>({});
  const [wishIsbns, setWishIsbns] = useState<Set<string>>(new Set());

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cacheRef = useRef<Map<string, GoogleBook[]>>(new Map());

  // Load existing library + wishlist ISBNs once on mount
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const [libRes, wishRes] = await Promise.all([
        supabase.from("books").select("id, isbn"),
        supabase.from("wishlist").select("isbn"),
      ]);
      if (libRes.data) {
        const map: Record<string, string> = {};
        libRes.data.forEach((b) => { if (b.isbn) map[b.isbn] = b.id; });
        setOwnedIsbns(map);
      }
      if (wishRes.data) {
        setWishIsbns(new Set(wishRes.data.map((w) => w.isbn).filter(Boolean)));
      }
    });
  }, []);

  // Clear results when switching mode
  useEffect(() => {
    setResults([]);
    setApiError(null);
  }, [mode]);

  useEffect(() => {
    if (!query.trim() || query.length < 3) {
      setResults([]);
      setApiError(null);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      const apiQuery = mode === "author" ? `inauthor:${query}` : query;
      const cached = cacheRef.current.get(apiQuery);
      if (cached) {
        setResults(cached);
        return;
      }

      setLoading(true);
      setApiError(null);
      try {
        const res = await fetch(`/api/books/search?q=${encodeURIComponent(apiQuery)}`);
        const data = await res.json();
        if (!res.ok || data.error) {
          setApiError(data.error ?? "Erreur API Google Books");
          setResults([]);
        } else {
          const items = data.items ?? [];
          cacheRef.current.set(apiQuery, items);
          setResults(items);
        }
      } catch (err) {
        setApiError(`Erreur réseau : ${String(err)}`);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 800);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, mode]);

  // Group results by author when in author mode
  const authorGroups = useMemo(() => {
    if (mode !== "author" || results.length === 0) return [];
    const map = new Map<string, { count: number; covers: string[] }>();
    for (const gb of results) {
      for (const author of gb.volumeInfo.authors ?? []) {
        const entry = map.get(author) ?? { count: 0, covers: [] };
        entry.count++;
        const cover = gb.volumeInfo.imageLinks?.thumbnail?.replace("http:", "https:");
        if (cover && entry.covers.length < 4) entry.covers.push(cover);
        map.set(author, entry);
      }
    }
    return [...map.entries()].sort((a, b) => b[1].count - a[1].count);
  }, [results, mode]);

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

    // Si on ajoute à la bibliothèque et que le livre était dans la wishlist → le retirer
    if (dest === "library" && info.isbn && wishIsbns.has(info.isbn)) {
      await supabase.from("wishlist").delete().eq("isbn", info.isbn);
      setWishIsbns((prev) => {
        const next = new Set(prev);
        next.delete(info.isbn!);
        return next;
      });
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

  const hasResults = mode === "title" ? results.length > 0 : authorGroups.length > 0;
  const isEmpty = !loading && !apiError && query.length >= 3 && !hasResults;

  return (
    <div className="max-w-lg mx-auto px-4">
      {/* ── Header ── */}
      <div className="pt-14 pb-4 animate-fade-up">
        <p className="text-[10px] font-bold text-amber-700 tracking-widest uppercase mb-1.5">
          Recherche
        </p>
        <h1 className="text-3xl font-bold text-stone-900 leading-none mb-5">
          Trouver un livre
        </h1>

        {/* ── Mode toggle ── */}
        <div className="flex gap-1 bg-stone-100/80 p-1 rounded-xl mb-4">
          {(["title", "author"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${
                mode === m
                  ? "bg-white text-stone-900 shadow-sm"
                  : "text-stone-400"
              }`}
            >
              {m === "title" ? "Par titre" : "Par auteur"}
            </button>
          ))}
        </div>

        {/* ── Search input ── */}
        <div className="relative">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            strokeWidth={1.8}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none"
          >
            <circle cx="11" cy="11" r="8" stroke="currentColor" />
            <path d="m21 21-4.35-4.35" stroke="currentColor" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            autoFocus
            placeholder={mode === "title" ? "Titre, auteur…" : "Nom de l'auteur…"}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-white border border-stone-200/80 rounded-xl pl-10 pr-4 py-3 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-600/40 shadow-sm text-sm"
          />
        </div>
      </div>

      {/* ── Loading ── */}
      {loading && (
        <div className="flex justify-center py-16 animate-fade-in">
          <div className="w-7 h-7 border-2 border-amber-700 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* ── API error ── */}
      {!loading && apiError && (
        <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-4 animate-fade-in">
          <p className="text-xs text-red-600 font-medium">Problème de connexion à Google Books</p>
          <p className="text-[11px] text-red-400 mt-0.5 break-all">{apiError}</p>
        </div>
      )}

      {/* ── No results ── */}
      {isEmpty && (
        <div className="flex flex-col items-center py-16 text-center gap-3 animate-fade-in">
          <div className="w-14 h-14 bg-stone-100 rounded-2xl flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.3} className="w-7 h-7 text-stone-300">
              <circle cx="11" cy="11" r="8" stroke="currentColor" />
              <path d="m21 21-4.35-4.35" stroke="currentColor" strokeLinecap="round" />
            </svg>
          </div>
          <p className="text-stone-500 text-sm">
            Aucun résultat pour{" "}
            <span className="font-semibold text-stone-700">&ldquo;{query}&rdquo;</span>
          </p>
        </div>
      )}

      {/* ── Empty prompt ── */}
      {!loading && query.length < 3 && (
        <div className="flex flex-col items-center py-20 text-center gap-4 animate-fade-in">
          <div className="w-16 h-16 bg-gradient-to-br from-amber-50 to-stone-100 rounded-3xl flex items-center justify-center">
            {mode === "title" ? (
              <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.2} className="w-8 h-8 text-amber-300">
                <circle cx="11" cy="11" r="8" stroke="currentColor" />
                <path d="m21 21-4.35-4.35" stroke="currentColor" strokeLinecap="round" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.2} className="w-8 h-8 text-amber-300">
                <circle cx="12" cy="8" r="4" stroke="currentColor" />
                <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeLinecap="round" />
              </svg>
            )}
          </div>
          <div>
            <p className="text-stone-700 font-semibold text-sm">
              {mode === "title" ? "Chercher un livre" : "Chercher un auteur"}
            </p>
            <p className="text-stone-400 text-xs mt-1">
              {mode === "title" ? "Par titre ou nom d'auteur" : "Entrez un nom d'auteur"}
            </p>
          </div>
        </div>
      )}

      {/* ── Author results ── */}
      {mode === "author" && !loading && authorGroups.length > 0 && (
        <div className="space-y-2.5 pb-6">
          {authorGroups.map(([name, { count, covers }], i) => (
            <button
              key={name}
              onClick={() => router.push(`/author/${encodeURIComponent(name)}`)}
              className="bg-white rounded-2xl p-4 border border-stone-100/80 flex gap-3.5 w-full text-left animate-fade-up hover:bg-stone-50/80 hover:shadow-[0_4px_20px_rgba(0,0,0,0.09)] hover:-translate-y-px active:scale-[0.98] transition-all duration-150"
              style={{ animationDelay: `${i * 40}ms`, boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
            >
              {/* Initials avatar */}
              <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0">
                <span className="text-amber-700 font-bold text-[15px]">
                  {name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-stone-900 text-[14px] leading-snug">{name}</p>
                <p className="text-stone-400 text-[11px] mt-0.5">
                  {count} œuvre{count > 1 ? "s" : ""} trouvée{count > 1 ? "s" : ""}
                </p>
                {covers.length > 0 && (
                  <div className="flex gap-1.5 mt-2">
                    {covers.map((url, j) => (
                      <div
                        key={j}
                        className="relative rounded overflow-hidden"
                        style={{ width: "28px", aspectRatio: "2/3" }}
                      >
                        <Image src={url} alt="" fill className="object-cover" sizes="28px" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} className="w-4 h-4 text-stone-300 self-center shrink-0">
                <path d="M9 18l6-6-6-6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          ))}
        </div>
      )}

      {/* ── Title results ── */}
      {mode === "title" && !loading && results.length > 0 && (
        <div className="space-y-2.5 pb-6">
          {results.map((gb, i) => {
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
                style={{ animationDelay: `${i * 40}ms`, boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
              >
                {/* Cover thumbnail */}
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

                {/* Info + actions */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-stone-900 text-[13px] leading-snug line-clamp-2">
                    {v.title}
                  </p>
                  {v.authors && (
                    <p className="text-stone-400 text-[11px] mt-0.5 truncate">
                      {v.authors.join(", ")}
                    </p>
                  )}
                  {v.publishedDate && (
                    <p className="text-stone-300 text-[11px]">
                      {v.publishedDate.slice(0, 4)}
                    </p>
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
                        <button
                          onClick={() => router.push(`/book/${inLibrary}`)}
                          className="text-[11px] font-bold text-amber-600 underline underline-offset-2 ml-2 shrink-0"
                        >
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
                        <button
                          onClick={() => save(gb, "library")}
                          disabled={saving === gb.id}
                          className="w-full bg-amber-700 text-white py-1.5 rounded-lg text-[11px] font-bold disabled:opacity-40 active:scale-95 transition-transform"
                        >
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
                        <button
                          onClick={() => save(gb, "library")}
                          disabled={saving === gb.id}
                          className="flex-1 bg-amber-700 text-white py-1.5 rounded-lg text-[11px] font-bold disabled:opacity-40 active:scale-95 transition-transform"
                        >
                          {saving === gb.id ? "…" : "Ma bibliothèque"}
                        </button>
                        <button
                          onClick={() => save(gb, "wishlist")}
                          disabled={saving === gb.id}
                          className="flex-1 border border-stone-200 text-stone-600 py-1.5 rounded-lg text-[11px] font-bold disabled:opacity-40 active:scale-95 transition-transform"
                        >
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
      )}
    </div>
  );
}
