"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useTransitionRouter } from "next-view-transitions";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { enhanceCoverUrl } from "@/lib/utils";
import type { BookInfo } from "@/lib/types";

interface VolumeInfo {
  title: string;
  authors?: string[];
  description?: string;
  publishedDate?: string;
  publisher?: string;
  pageCount?: number;
  categories?: string[];
  imageLinks?: {
    thumbnail?: string;
    smallThumbnail?: string;
    small?: string;
    medium?: string;
    large?: string;
  };
  industryIdentifiers?: { type: string; identifier: string }[];
}

interface GoogleVolume {
  id: string;
  volumeInfo: VolumeInfo;
}

type AlreadyIn = { table: "library" | "wishlist"; id: string } | null;

export default function BookPreviewPage() {
  const { id } = useParams<{ id: string }>();
  const router = useTransitionRouter();

  const [volume, setVolume] = useState<GoogleVolume | null>(null);
  const [loading, setLoading] = useState(true);
  const [alreadyIn, setAlreadyIn] = useState<AlreadyIn>(null);
  const [saving, setSaving] = useState<"library" | "wishlist" | null>(null);
  const [justSaved, setJustSaved] = useState<"library" | "wishlist" | null>(null);

  useEffect(() => {
    fetch(`/api/books/volume/${id}`)
      .then((r) => r.json())
      .then(async (data) => {
        if (data.error) { setLoading(false); return; }
        setVolume(data);

        // Check if already in library or wishlist
        const isbnObj = (data.volumeInfo?.industryIdentifiers ?? []).find(
          (i: { type: string }) => i.type === "ISBN_13" || i.type === "ISBN_10"
        );
        const isbn = isbnObj?.identifier ?? data.id;

        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const [libRes, wishRes] = await Promise.all([
            supabase.from("books").select("id").eq("isbn", isbn).maybeSingle(),
            supabase.from("wishlist").select("id").eq("isbn", isbn).maybeSingle(),
          ]);
          if (libRes.data) setAlreadyIn({ table: "library", id: libRes.data.id });
          else if (wishRes.data) setAlreadyIn({ table: "wishlist", id: wishRes.data.id });
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  const toBookInfo = (): BookInfo | null => {
    if (!volume) return null;
    const v = volume.volumeInfo;
    const isbnObj = v.industryIdentifiers?.find(
      (i) => i.type === "ISBN_13" || i.type === "ISBN_10"
    );
    return {
      isbn: isbnObj?.identifier ?? volume.id,
      title: v.title,
      author: v.authors?.join(", ") ?? null,
      cover_url: enhanceCoverUrl(v.imageLinks?.thumbnail),
      description: v.description ?? null,
      published_year: v.publishedDate ? parseInt(v.publishedDate) : null,
    };
  };

  const save = async (dest: "library" | "wishlist") => {
    const info = toBookInfo();
    if (!info) return;
    setSaving(dest);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    const table = dest === "library" ? "books" : "wishlist";
    const payload =
      dest === "library"
        ? { ...info, status: "owned", user_id: user.id }
        : { ...info, user_id: user.id };

    const { data: inserted } = await supabase.from(table).insert(payload).select("id").single();

    // Si on ajoute à la bibliothèque et que c'était dans la wishlist → supprimer
    if (dest === "library" && alreadyIn?.table === "wishlist") {
      await supabase.from("wishlist").delete().eq("id", alreadyIn.id);
    }

    if (inserted?.id) {
      setAlreadyIn({ table: dest, id: inserted.id });
    }
    setJustSaved(dest);
    setSaving(null);
  };

  const v = volume?.volumeInfo;
  const coverUrl = enhanceCoverUrl(v?.imageLinks?.medium ?? v?.imageLinks?.thumbnail);

  // ── Loading skeleton ──
  if (loading) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="relative w-full h-72 bg-stone-900 flex items-center justify-center">
          <div
            className="shimmer rounded-lg"
            style={{
              height: "208px",
              width: "139px",
              animation: "hero-cover-enter 0.9s cubic-bezier(0.34,1.56,0.64,1) 80ms both",
            }}
          />
        </div>
        <div className="px-4 pt-5 space-y-3">
          <div className="shimmer h-6 rounded-full w-3/4" />
          <div className="shimmer h-4 rounded-full w-1/2" />
        </div>
      </div>
    );
  }

  if (!volume || !v) {
    return (
      <div className="flex flex-col items-center pt-24 gap-4 animate-fade-in">
        <p className="text-stone-500 font-medium">Livre introuvable</p>
        <button
          onClick={() => router.back()}
          className="text-amber-700 font-semibold text-sm underline underline-offset-2"
        >
          Retour
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">

      {/* ── Hero ── */}
      <div className="relative w-full h-72 overflow-hidden bg-stone-900">
        {coverUrl && (
          <div className="absolute inset-0 scale-110 animate-fade-in" style={{ animationDelay: "120ms" }}>
            <Image
              src={coverUrl}
              alt=""
              fill
              className="object-cover opacity-40 blur-xl"
              sizes="100vw"
              aria-hidden
            />
          </div>
        )}
        <div
          className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60 animate-fade-in"
          style={{ animationDelay: "120ms" }}
        />

        {/* Cover */}
        <div className="absolute inset-0 flex items-center justify-center py-6">
          {coverUrl ? (
            <div
              style={{
                position: "relative",
                height: "208px",
                width: "139px",
                borderRadius: "8px",
                overflow: "hidden",
                background: "rgb(41,37,36)",
                animation: "hero-cover-enter 0.9s cubic-bezier(0.34,1.56,0.64,1) 220ms both",
              }}
            >
              <Image
                src={coverUrl}
                alt={v.title}
                fill
                className="object-cover"
                sizes="33vw"
                priority
              />
            </div>
          ) : (
            <div
              className="w-28 h-40 rounded-xl bg-amber-900/30 border border-amber-700/20 flex items-center justify-center"
              style={{ animation: "hero-cover-enter 0.9s cubic-bezier(0.34,1.56,0.64,1) 220ms both" }}
            >
              <svg viewBox="0 0 24 24" fill="none" className="w-12 h-12 text-amber-400/60" strokeWidth={1}>
                <path d="M8 3H5a2 2 0 00-2 2v14a2 2 0 002 2h3M8 3v18M8 3h8a2 2 0 012 2v14a2 2 0 01-2 2H8" stroke="currentColor" />
                <path d="M16 3h3a2 2 0 012 2v14a2 2 0 01-2 2h-3" stroke="currentColor" />
              </svg>
            </div>
          )}
        </div>

        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="absolute top-12 left-4 w-9 h-9 bg-black/30 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/10 active:scale-90 transition-transform animate-fade-in"
          style={{ animationDelay: "800ms" }}
        >
          <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} className="w-5 h-5 text-white">
            <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* ── Content ── */}
      <div
        className="px-4 pt-5 pb-10 animate-content-rise"
        style={{ animationDelay: "1400ms" }}
      >
        <h1 className="text-xl font-bold text-stone-900 leading-snug">{v.title}</h1>

        {/* Authors — each clickable */}
        {v.authors && v.authors.length > 0 && (
          <p className="mt-1 text-[15px] flex flex-wrap gap-x-1">
            {v.authors.map((a, i, arr) => (
              <span key={a} className="flex items-center gap-x-1">
                <button
                  onClick={() => router.push(`/author/${encodeURIComponent(a.trim())}`)}
                  className="text-stone-500 underline underline-offset-2 decoration-stone-300 active:text-amber-700 transition-colors"
                >
                  {a.trim()}
                </button>
                {i < arr.length - 1 && <span className="text-stone-400">,</span>}
              </span>
            ))}
          </p>
        )}

        {/* Year + metadata */}
        <div className="flex items-center gap-2 flex-wrap mt-0.5">
          {v.publishedDate && (
            <p className="text-stone-400 text-sm">{v.publishedDate.slice(0, 4)}</p>
          )}
          {v.pageCount && (
            <>
              <span className="text-stone-300 text-sm">·</span>
              <p className="text-stone-400 text-sm">{v.pageCount} pages</p>
            </>
          )}
          {v.publisher && (
            <>
              <span className="text-stone-300 text-sm">·</span>
              <p className="text-stone-400 text-sm truncate max-w-[180px]">{v.publisher}</p>
            </>
          )}
        </div>

        {/* ── Save actions ── */}
        <div className="mt-6 pt-5 border-t border-stone-100 space-y-2.5">

          {/* Already in library */}
          {(alreadyIn?.table === "library" || justSaved === "library") && (
            <div className="space-y-2">
              <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
                <span className="text-sm font-semibold text-amber-800 flex items-center gap-2">
                  <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-amber-600" strokeWidth={2.5}>
                    <path d="M9 12l2 2 4-4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx="12" cy="12" r="9" stroke="currentColor" />
                  </svg>
                  Dans ta bibliothèque
                </span>
                {alreadyIn?.table === "library" && (
                  <button
                    onClick={() => router.push(`/book/${alreadyIn.id}`)}
                    className="text-sm font-bold text-amber-700 underline underline-offset-2 shrink-0 ml-3"
                  >
                    Voir →
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Already in wishlist — keep "add to library" available */}
          {(alreadyIn?.table === "wishlist" || justSaved === "wishlist") && justSaved !== "library" && alreadyIn?.table !== "library" && (
            <div className="space-y-2.5">
              <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-center justify-between">
                <span className="text-sm font-semibold text-amber-800 flex items-center gap-2">
                  <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-amber-600" strokeWidth={2.5}>
                    <path d="M9 12l2 2 4-4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx="12" cy="12" r="9" stroke="currentColor" />
                  </svg>
                  Dans ta wishlist
                </span>
              </div>
              <button
                onClick={() => save("library")}
                disabled={saving === "library"}
                className="w-full bg-amber-700 text-white py-3.5 rounded-2xl font-bold disabled:opacity-50 active:scale-[0.98] transition-transform"
                style={{ boxShadow: "0 4px 16px rgba(180,83,9,0.25)" }}
              >
                {saving === "library" ? "Enregistrement…" : "Ajouter à ma bibliothèque"}
              </button>
            </div>
          )}

          {/* Not saved anywhere */}
          {!alreadyIn && !justSaved && (
            <>
              <button
                onClick={() => save("library")}
                disabled={!!saving}
                className="w-full bg-amber-700 text-white py-3.5 rounded-2xl font-bold disabled:opacity-50 active:scale-[0.98] transition-transform"
                style={{ boxShadow: "0 4px 16px rgba(180,83,9,0.25)" }}
              >
                {saving === "library" ? "Enregistrement…" : "Ajouter à ma bibliothèque"}
              </button>
              <button
                onClick={() => save("wishlist")}
                disabled={!!saving}
                className="w-full border-2 border-amber-700 text-amber-700 py-3.5 rounded-2xl font-bold disabled:opacity-50 active:scale-[0.98] transition-transform"
              >
                {saving === "wishlist" ? "Enregistrement…" : "Ajouter à ma wishlist"}
              </button>
            </>
          )}
        </div>

        {/* ── Description ── */}
        {v.description && (
          <div className="mt-5 pt-5 border-t border-stone-100">
            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-3">
              Résumé
            </p>
            <p className="text-sm text-stone-600 leading-relaxed whitespace-pre-wrap">
              {v.description}
            </p>
          </div>
        )}

        {/* ── Categories ── */}
        {v.categories && v.categories.length > 0 && (
          <div className="mt-5 pt-5 border-t border-stone-100">
            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-3">
              Catégories
            </p>
            <div className="flex flex-wrap gap-2">
              {v.categories.map((cat) => (
                <span
                  key={cat}
                  className="px-3 py-1 bg-stone-100 text-stone-600 text-xs font-medium rounded-full"
                >
                  {cat}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
