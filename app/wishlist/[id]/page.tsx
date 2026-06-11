"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useTransitionRouter } from "next-view-transitions";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { enhanceCoverUrl, stripHtml } from "@/lib/utils";
import type { WishlistItem } from "@/lib/types";

export default function WishlistBookPage() {
  const { id } = useParams<{ id: string }>();
  const router = useTransitionRouter();
  const [item, setItem] = useState<WishlistItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [moving, setMoving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("wishlist")
      .select("*")
      .eq("id", id)
      .single()
      .then(({ data }) => {
        setItem(data);
        setLoading(false);
      });
  }, [id]);

  const moveToLibrary = async () => {
    if (!item) return;
    setMoving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

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
    await supabase.from("wishlist").delete().eq("id", id);
    router.push("/");
  };

  const remove = async () => {
    setRemoving(true);
    const supabase = createClient();
    await supabase.from("wishlist").delete().eq("id", id);
    router.back();
  };

  const coverUrl = enhanceCoverUrl(item?.cover_url);

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

  if (!item) {
    return (
      <div className="flex flex-col items-center pt-24 gap-4 animate-fade-in">
        <p className="text-stone-500 font-medium">Livre introuvable</p>
        <button
          onClick={() => router.push("/wishlist")}
          className="text-amber-700 font-semibold text-sm underline underline-offset-2"
        >
          Retour à la wishlist
        </button>
      </div>
    );
  }

  const description = stripHtml(item.description);

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
                alt={item.title}
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
        <h1 className="text-xl font-bold text-stone-900 leading-snug">{item.title}</h1>
        {item.author && (
          <p className="mt-1 text-[15px] text-stone-500">{item.author}</p>
        )}
        {item.published_year && (
          <p className="text-stone-400 text-sm mt-0.5">{item.published_year}</p>
        )}

        {/* ── Actions ── */}
        <div className="mt-6 pt-5 border-t border-stone-100 space-y-2.5">
          <button
            onClick={moveToLibrary}
            disabled={moving || removing}
            className="w-full bg-amber-700 text-white py-3.5 rounded-2xl font-bold disabled:opacity-50 active:scale-[0.98] transition-transform"
            style={{ boxShadow: "0 4px 16px rgba(180,83,9,0.25)" }}
          >
            {moving ? "Enregistrement…" : "J'ai acheté ce livre"}
          </button>
        </div>

        {/* ── Description ── */}
        {description && (
          <div className="mt-5 pt-5 border-t border-stone-100">
            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-3">
              Résumé
            </p>
            <p className="text-sm text-stone-600 leading-relaxed whitespace-pre-wrap">
              {description}
            </p>
          </div>
        )}

        {/* ── Delete ── */}
        <div className="mt-8">
          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full border border-stone-200 text-stone-400 py-3.5 rounded-2xl font-medium active:scale-[0.98] transition-transform text-sm"
            >
              Supprimer de la wishlist
            </button>
          ) : (
            <div className="border border-red-100 rounded-2xl p-4 bg-red-50 space-y-3 animate-scale-in">
              <p className="text-sm text-red-700 text-center font-semibold">
                Confirmer la suppression ?
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-2.5 border border-stone-200 rounded-xl text-stone-600 text-sm bg-white font-medium"
                >
                  Annuler
                </button>
                <button
                  onClick={remove}
                  disabled={removing}
                  className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-bold disabled:opacity-50"
                >
                  Supprimer
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
