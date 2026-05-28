"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { enhanceCoverUrl } from "@/lib/utils";
import type { WishlistItem } from "@/lib/types";

export default function WishlistPage() {
  const router = useRouter();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("wishlist")
      .select("*")
      .order("created_at", { ascending: false });
    setItems(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const moveToLibrary = async (item: WishlistItem) => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    await supabase.from("books").insert({
      isbn: item.isbn,
      title: item.title,
      author: item.author,
      cover_url: item.cover_url,
      description: item.description,
      published_year: item.published_year,
      status: "owned",
      user_id: user.id,
    });
    await supabase.from("wishlist").delete().eq("id", item.id);
    setItems((prev) => prev.filter((i) => i.id !== item.id));
  };

  const remove = async (id: string) => {
    const supabase = createClient();
    await supabase.from("wishlist").delete().eq("id", id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  return (
    <div className="max-w-lg mx-auto px-4">
      {/* ── Header ── */}
      <div className="pt-14 pb-5 animate-fade-up">
        <p className="text-[10px] font-bold text-amber-700 tracking-widest uppercase mb-1.5">
          À lire
        </p>
        <div className="flex items-end justify-between">
          <h1 className="text-4xl font-bold text-stone-900 leading-none tabular-nums">
            {loading ? (
              <span className="shimmer inline-block w-10 h-9 rounded-lg align-middle" />
            ) : (
              items.length
            )}
            <span className="text-stone-200 font-light ml-2 text-3xl">
              souhait{items.length !== 1 ? "s" : ""}
            </span>
          </h1>
          <Link
            href="/search"
            className="flex items-center gap-1.5 bg-amber-700 text-white px-3 py-1.5 rounded-full text-[11px] font-bold tracking-wide active:scale-[0.96] transition-transform"
          >
            <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5" strokeWidth={2.5}>
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeLinecap="round" />
            </svg>
            Ajouter
          </Link>
        </div>
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="space-y-3 pb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl p-3.5 flex gap-3.5 border border-stone-100"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className="shimmer w-12 rounded-lg" style={{ aspectRatio: "2/3" }} />
              <div className="flex-1 space-y-2 pt-1">
                <div className="shimmer h-3.5 rounded-full w-3/4" />
                <div className="shimmer h-3 rounded-full w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center gap-4 animate-fade-in">
          <div className="w-20 h-20 bg-gradient-to-br from-rose-50 to-pink-50 rounded-3xl flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.2} className="w-10 h-10 text-rose-300">
              <path
                d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                stroke="currentColor"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <div>
            <p className="text-stone-900 font-bold text-lg mb-1">Wishlist vide</p>
            <p className="text-stone-400 text-sm mb-7">
              Ajoutez les livres que vous souhaitez lire
            </p>
          </div>
          <Link
            href="/search"
            className="bg-amber-700 text-white px-7 py-3 rounded-full text-sm font-bold shadow-sm active:scale-[0.97] transition-transform"
          >
            Chercher un livre
          </Link>
        </div>
      ) : (
        <div className="space-y-2.5 pb-6">
          {items.map((item, i) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl p-3.5 border border-stone-100/80 flex gap-3.5 animate-fade-up"
              style={{
                animationDelay: `${i * 45}ms`,
                boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
              }}
            >
              {/* Cover */}
              {item.cover_url ? (
                <div className="relative w-12 shrink-0 rounded-lg overflow-hidden" style={{ aspectRatio: "2/3" }}>
                  <Image
                    src={enhanceCoverUrl(item.cover_url) ?? item.cover_url}
                    alt={item.title}
                    fill
                    className="object-cover"
                    sizes="48px"
                  />
                </div>
              ) : (
                <div
                  className="w-12 shrink-0 rounded-lg bg-gradient-to-br from-amber-50 to-stone-100 flex items-center justify-center"
                  style={{ aspectRatio: "2/3" }}
                >
                  <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-amber-300" strokeWidth={1.2}>
                    <path d="M8 3H5a2 2 0 00-2 2v14a2 2 0 002 2h3M8 3v18M8 3h8a2 2 0 012 2v14a2 2 0 01-2 2H8" stroke="currentColor" strokeLinecap="round" />
                    <path d="M16 3h3a2 2 0 012 2v14a2 2 0 01-2 2h-3" stroke="currentColor" strokeLinecap="round" />
                  </svg>
                </div>
              )}

              {/* Info + actions */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-stone-900 text-[13px] leading-snug line-clamp-2">
                  {item.title}
                </p>
                {item.author && (
                  <p className="text-stone-400 text-[11px] mt-0.5 truncate">{item.author}</p>
                )}
                {item.published_year && (
                  <p className="text-stone-300 text-[11px]">{item.published_year}</p>
                )}
                <div className="flex gap-1.5 mt-2.5">
                  <button
                    onClick={() => moveToLibrary(item)}
                    className="flex-1 bg-amber-700 text-white py-1.5 rounded-lg text-[11px] font-bold active:scale-95 transition-transform"
                  >
                    J&apos;ai acheté ce livre
                  </button>
                  <button
                    onClick={() => remove(item.id)}
                    className="p-1.5 rounded-lg border border-stone-200 text-stone-400 active:scale-95 transition-transform"
                  >
                    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8} className="w-4 h-4">
                      <path
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
