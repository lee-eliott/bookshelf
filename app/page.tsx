"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import BookCard from "@/components/BookCard";
import { createClient } from "@/lib/supabase/client";
import type { Book } from "@/lib/types";

type Filter = "all" | 1 | 2 | 3 | 4 | 5;

const RATING_FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "Tous" },
  { value: 1, label: "★" },
  { value: 2, label: "★★" },
  { value: 3, label: "★★★" },
  { value: 4, label: "★★★★" },
  { value: 5, label: "★★★★★" },
];

export default function LibraryPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("books")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setBooks(data ?? []);
        setLoading(false);
      });
  }, []);

  const filtered = books.filter((b) => {
    const matchSearch =
      !search ||
      b.title.toLowerCase().includes(search.toLowerCase()) ||
      b.author?.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || b.rating === filter;
    return matchSearch && matchFilter;
  });

  return (
    <div className="max-w-lg mx-auto px-4">
      {/* ── Header ── */}
      <div className="pt-14 pb-5 animate-fade-up">
        <p className="text-[10px] font-bold text-amber-700 tracking-widest uppercase mb-1.5">
          Ma bibliothèque
        </p>
        <h1 className="text-4xl font-bold text-stone-900 leading-none tabular-nums">
          {loading ? (
            <span className="shimmer inline-block w-10 h-9 rounded-lg align-middle" />
          ) : (
            books.length
          )}
          <span className="text-stone-200 font-light ml-2 text-3xl">
            livre{books.length !== 1 ? "s" : ""}
          </span>
        </h1>
      </div>

      {/* ── Search + Filters (sticky) ── */}
      <div className="sticky top-0 bg-[#fafaf8]/95 backdrop-blur-sm z-10 pb-3 pt-1 -mx-4 px-4">
        <div className="relative mb-3">
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
            placeholder="Titre, auteur…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white border border-stone-200/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-600/40 shadow-sm"
          />
        </div>

        {/* Rating filters — horizontal scroll on small screens */}
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
          {RATING_FILTERS.map(({ value, label }) => (
            <button
              key={String(value)}
              onClick={() => setFilter(value)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold tracking-wide transition-all duration-200 active:scale-[0.96] ${
                filter === value
                  ? "bg-stone-900 text-white shadow-sm"
                  : "bg-white border border-stone-200 text-stone-500"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="grid grid-cols-2 gap-3 pb-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ animationDelay: `${i * 50}ms` }}>
              <div className="shimmer w-full aspect-[2/3] rounded-2xl" />
              <div className="pt-2.5 space-y-1.5 px-1">
                <div className="shimmer h-3 rounded-full w-4/5" />
                <div className="shimmer h-2.5 rounded-full w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center animate-fade-in">
          {books.length === 0 ? (
            <>
              <div className="w-20 h-20 bg-gradient-to-br from-amber-50 to-amber-100/60 rounded-3xl flex items-center justify-center mb-5 shadow-sm">
                <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.2} className="w-10 h-10 text-amber-400">
                  <path d="M8 3H5a2 2 0 00-2 2v14a2 2 0 002 2h3M8 3v18M8 3h8a2 2 0 012 2v14a2 2 0 01-2 2H8" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M16 3h3a2 2 0 012 2v14a2 2 0 01-2 2h-3" stroke="currentColor" strokeLinecap="round" />
                </svg>
              </div>
              <p className="text-stone-900 font-bold text-lg mb-1">Bibliothèque vide</p>
              <p className="text-stone-400 text-sm mb-7">Commencez par scanner un livre</p>
              <Link
                href="/scan"
                className="bg-amber-700 text-white px-7 py-3 rounded-full text-sm font-bold shadow-sm active:scale-[0.97] transition-transform"
              >
                Scanner un livre
              </Link>
            </>
          ) : (
            <p className="text-stone-400 text-sm">
              {filter !== "all"
                ? `Aucun livre noté ${filter} étoile${filter > 1 ? "s" : ""}`
                : "Aucun résultat"}
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 pb-6">
          {filtered.map((book, i) => (
            <BookCard key={book.id} book={book} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
