"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { BookInfo } from "@/lib/types";

const BarcodeScanner = dynamic(() => import("@/components/BarcodeScanner"), {
  ssr: false,
  loading: () => (
    <div className="w-full aspect-square max-w-sm mx-auto rounded-2xl bg-stone-900 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-amber-700 border-t-transparent rounded-full animate-spin" />
    </div>
  ),
});

type State = "scan" | "loading" | "found" | "manual" | "notfound" | "manual-entry";
type AlreadyIn = { table: "library" | "wishlist"; id: string } | null;

export default function ScanPage() {
  const router = useRouter();
  const [state, setState] = useState<State>("scan");
  const [bookInfo, setBookInfo] = useState<BookInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [manualIsbn, setManualIsbn] = useState("");
  const [saving, setSaving] = useState(false);
  const [alreadyIn, setAlreadyIn] = useState<AlreadyIn>(null);

  // Manual entry form state
  const [manualTitle, setManualTitle] = useState("");
  const [manualAuthor, setManualAuthor] = useState("");
  const [manualYear, setManualYear] = useState("");
  const [scannedIsbn, setScannedIsbn] = useState("");

  const lookup = useCallback(async (isbn: string) => {
    setState("loading");
    setError(null);
    setAlreadyIn(null);
    setScannedIsbn(isbn);
    try {
      const res = await fetch(`/api/books/${isbn}`);
      if (!res.ok) { setState("notfound"); return; }
      const data = await res.json();
      setBookInfo(data);

      // Check if already in library or wishlist
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const [libResult, wishResult] = await Promise.all([
          supabase.from("books").select("id").eq("isbn", isbn).maybeSingle(),
          supabase.from("wishlist").select("id").eq("isbn", isbn).maybeSingle(),
        ]);
        if (libResult.data) {
          setAlreadyIn({ table: "library", id: libResult.data.id });
        } else if (wishResult.data) {
          setAlreadyIn({ table: "wishlist", id: wishResult.data.id });
        }
      }

      setState("found");
    } catch {
      setState("notfound");
    }
  }, []);

  const save = async (destination: "library" | "wishlist") => {
    if (!bookInfo) return;
    setSaving(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    const table = destination === "library" ? "books" : "wishlist";
    const payload = destination === "library"
      ? { ...bookInfo, status: "owned", user_id: user.id }
      : { ...bookInfo, user_id: user.id };

    await supabase.from(table).insert(payload);

    // Si on ajoute à la bibliothèque et que le livre était dans la wishlist → le retirer
    if (destination === "library" && alreadyIn?.table === "wishlist") {
      await supabase.from("wishlist").delete().eq("id", alreadyIn.id);
    }

    router.push(destination === "library" ? "/" : "/wishlist");
  };

  const saveManual = async (destination: "library" | "wishlist") => {
    if (!manualTitle.trim()) return;
    setSaving(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    const info: BookInfo = {
      isbn: scannedIsbn || null,
      title: manualTitle.trim(),
      author: manualAuthor.trim() || null,
      cover_url: null,
      description: null,
      published_year: manualYear ? parseInt(manualYear) : null,
    };

    const table = destination === "library" ? "books" : "wishlist";
    const payload = destination === "library"
      ? { ...info, status: "owned", user_id: user.id }
      : { ...info, user_id: user.id };

    await supabase.from(table).insert(payload);
    router.push(destination === "library" ? "/" : "/wishlist");
  };

  const reset = () => {
    setState("scan");
    setBookInfo(null);
    setError(null);
    setAlreadyIn(null);
    setManualIsbn("");
    setManualTitle("");
    setManualAuthor("");
    setManualYear("");
    setScannedIsbn("");
  };

  return (
    <div className="max-w-lg mx-auto px-4">
      {/* ── Header ── */}
      <div className="pt-14 pb-5 animate-fade-up">
        <p className="text-[10px] font-bold text-amber-700 tracking-widest uppercase mb-1.5">
          Ajouter un livre
        </p>
        <h1 className="text-3xl font-bold text-stone-900 leading-none mb-1">Scanner</h1>
        <p className="text-sm text-stone-400">
          Pointez la caméra vers le code-barres
        </p>
      </div>

      {/* ── Camera scan ── */}
      {state === "scan" && (
        <div className="animate-fade-in">
          <BarcodeScanner onScan={lookup} onError={setError} />
          {error && (
            <p className="mt-3 text-sm text-red-500 text-center">{error}</p>
          )}
          <div className="mt-6 flex flex-col items-center gap-3">
            <button
              onClick={() => setState("manual")}
              className="text-sm text-amber-700 font-semibold underline underline-offset-2"
            >
              Entrer un ISBN manuellement
            </button>
            <button
              onClick={() => setState("manual-entry")}
              className="text-sm text-stone-400 font-medium"
            >
              Saisir le titre directement
            </button>
          </div>
        </div>
      )}

      {/* ── ISBN manual input ── */}
      {state === "manual" && (
        <div className="space-y-3 animate-fade-up">
          <input
            type="number"
            placeholder="ISBN (10 ou 13 chiffres)"
            value={manualIsbn}
            onChange={(e) => setManualIsbn(e.target.value)}
            className="w-full border border-stone-200/80 rounded-xl px-4 py-3 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-600/40 bg-white text-sm shadow-sm"
          />
          <button
            onClick={() => lookup(manualIsbn)}
            disabled={manualIsbn.length < 10}
            className="w-full bg-amber-700 text-white py-3.5 rounded-xl font-bold disabled:opacity-40 active:scale-[0.98] transition-transform"
          >
            Rechercher
          </button>
          <button
            onClick={reset}
            className="w-full text-sm text-stone-400 font-medium py-2"
          >
            Retour au scanner
          </button>
        </div>
      )}

      {/* ── Loading ── */}
      {state === "loading" && (
        <div className="flex flex-col items-center py-20 gap-4 animate-fade-in">
          <div className="w-10 h-10 border-2 border-amber-700 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-stone-500">Recherche du livre…</p>
        </div>
      )}

      {/* ── Not found → propose manual entry ── */}
      {state === "notfound" && (
        <div className="flex flex-col items-center gap-5 text-center animate-scale-in pt-8">
          <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center border border-amber-100">
            <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.3} className="w-8 h-8 text-amber-400">
              <path d="M8 3H5a2 2 0 00-2 2v14a2 2 0 002 2h3M8 3v18M8 3h8a2 2 0 012 2v14a2 2 0 01-2 2H8" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M16 3h3a2 2 0 012 2v14a2 2 0 01-2 2h-3" stroke="currentColor" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <p className="text-stone-800 font-bold text-lg">Livre non trouvé</p>
            <p className="text-stone-400 text-sm mt-1 leading-relaxed px-4">
              Ce livre n&apos;est pas encore dans les bases de données.{"\n"}
              Vous pouvez le saisir manuellement.
            </p>
          </div>
          <div className="w-full space-y-2.5">
            <button
              onClick={() => setState("manual-entry")}
              className="w-full bg-amber-700 text-white py-3.5 rounded-2xl font-bold active:scale-[0.98] transition-transform"
              style={{ boxShadow: "0 4px 16px rgba(180,83,9,0.25)" }}
            >
              Saisir le titre manuellement
            </button>
            <button
              onClick={reset}
              className="w-full border border-stone-200 text-stone-500 py-3 rounded-2xl font-medium text-sm active:bg-stone-50 transition-colors"
            >
              Réessayer avec la caméra
            </button>
          </div>
        </div>
      )}

      {/* ── Manual book entry form ── */}
      {state === "manual-entry" && (
        <div className="space-y-4 animate-fade-up">
          <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 mb-2">
            <p className="text-xs text-amber-700 font-medium">
              Remplissez les informations du livre. Seul le titre est obligatoire.
            </p>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2">
              Titre <span className="text-amber-600">*</span>
            </label>
            <input
              type="text"
              placeholder="Titre du livre"
              value={manualTitle}
              onChange={(e) => setManualTitle(e.target.value)}
              autoFocus
              className="w-full border border-stone-200/80 rounded-xl px-4 py-3 text-stone-900 placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-600/40 bg-white text-sm shadow-sm"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2">
              Auteur
            </label>
            <input
              type="text"
              placeholder="Nom de l'auteur"
              value={manualAuthor}
              onChange={(e) => setManualAuthor(e.target.value)}
              className="w-full border border-stone-200/80 rounded-xl px-4 py-3 text-stone-900 placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-600/40 bg-white text-sm shadow-sm"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2">
              Année de parution
            </label>
            <input
              type="number"
              placeholder="2024"
              value={manualYear}
              onChange={(e) => setManualYear(e.target.value)}
              className="w-full border border-stone-200/80 rounded-xl px-4 py-3 text-stone-900 placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-600/40 bg-white text-sm shadow-sm"
            />
          </div>

          <div className="space-y-2.5 pt-2">
            <button
              onClick={() => saveManual("library")}
              disabled={saving || !manualTitle.trim()}
              className="w-full bg-amber-700 text-white py-3.5 rounded-2xl font-bold disabled:opacity-40 active:scale-[0.98] transition-transform"
              style={{ boxShadow: "0 4px 16px rgba(180,83,9,0.25)" }}
            >
              {saving ? "Enregistrement…" : "Ajouter à ma bibliothèque"}
            </button>
            <button
              onClick={() => saveManual("wishlist")}
              disabled={saving || !manualTitle.trim()}
              className="w-full border-2 border-amber-700 text-amber-700 py-3.5 rounded-2xl font-bold disabled:opacity-40 active:scale-[0.98] transition-transform"
            >
              Ajouter à ma wishlist
            </button>
            <button
              onClick={reset}
              className="w-full text-sm text-stone-400 font-medium py-2"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* ── Book found ── */}
      {state === "found" && bookInfo && (
        <div className="space-y-4 animate-scale-in">
          {/* Book card */}
          <div
            className="bg-white rounded-2xl p-4 border border-stone-100/80 flex gap-4"
            style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}
          >
            {bookInfo.cover_url ? (
              <div className="relative w-20 shrink-0 rounded-lg overflow-hidden" style={{ aspectRatio: "2/3" }}>
                <Image
                  src={bookInfo.cover_url}
                  alt={bookInfo.title}
                  fill
                  className="object-cover"
                  sizes="80px"
                />
              </div>
            ) : (
              <div
                className="w-20 shrink-0 rounded-lg bg-gradient-to-br from-amber-50 to-stone-100 flex items-center justify-center"
                style={{ aspectRatio: "2/3" }}
              >
                <svg viewBox="0 0 24 24" fill="none" className="w-8 h-8 text-amber-300" strokeWidth={1.2}>
                  <path d="M8 3H5a2 2 0 00-2 2v14a2 2 0 002 2h3M8 3v18M8 3h8a2 2 0 012 2v14a2 2 0 01-2 2H8" stroke="currentColor" strokeLinecap="round" />
                  <path d="M16 3h3a2 2 0 012 2v14a2 2 0 01-2 2h-3" stroke="currentColor" strokeLinecap="round" />
                </svg>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-bold text-stone-900 leading-snug text-[15px]">{bookInfo.title}</p>
              {bookInfo.author && (
                <p className="text-stone-500 text-sm mt-0.5">{bookInfo.author}</p>
              )}
              {bookInfo.published_year && (
                <p className="text-stone-400 text-xs mt-0.5">{bookInfo.published_year}</p>
              )}
            </div>
          </div>

          {/* Already in library */}
          {alreadyIn?.table === "library" && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-4 flex items-center justify-between animate-fade-in">
              <div className="flex items-center gap-2">
                <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-amber-600 shrink-0" strokeWidth={2}>
                  <path d="M9 12l2 2 4-4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="12" cy="12" r="9" stroke="currentColor" />
                </svg>
                <p className="text-sm font-semibold text-amber-800">Déjà dans ta bibliothèque</p>
              </div>
              <button
                onClick={() => router.push(`/book/${alreadyIn.id}`)}
                className="text-sm font-bold text-amber-700 underline underline-offset-2 shrink-0 ml-3"
              >
                Voir →
              </button>
            </div>
          )}

          {/* Already in wishlist — still allow adding to library */}
          {alreadyIn?.table === "wishlist" && (
            <div className="space-y-2.5">
              <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-4 flex items-center justify-between animate-fade-in">
                <div className="flex items-center gap-2">
                  <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-amber-600 shrink-0" strokeWidth={2}>
                    <path d="M9 12l2 2 4-4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx="12" cy="12" r="9" stroke="currentColor" />
                  </svg>
                  <p className="text-sm font-semibold text-amber-800">Déjà dans ta wishlist</p>
                </div>
                <button
                  onClick={() => router.push("/wishlist")}
                  className="text-sm font-bold text-amber-700 underline underline-offset-2 shrink-0 ml-3"
                >
                  Voir →
                </button>
              </div>
              <button
                onClick={() => save("library")}
                disabled={saving}
                className="w-full bg-amber-700 text-white py-3.5 rounded-2xl font-bold disabled:opacity-50 active:scale-[0.98] transition-transform"
                style={{ boxShadow: "0 4px 16px rgba(180,83,9,0.25)" }}
              >
                {saving ? "Enregistrement…" : "Ajouter à ma bibliothèque"}
              </button>
            </div>
          )}

          {/* Not in library or wishlist — show both options */}
          {!alreadyIn && (
            <div className="space-y-2.5">
              <button
                onClick={() => save("library")}
                disabled={saving}
                className="w-full bg-amber-700 text-white py-3.5 rounded-2xl font-bold disabled:opacity-50 active:scale-[0.98] transition-transform"
                style={{ boxShadow: "0 4px 16px rgba(180,83,9,0.25)" }}
              >
                {saving ? "Enregistrement…" : "Ajouter à ma bibliothèque"}
              </button>
              <button
                onClick={() => save("wishlist")}
                disabled={saving}
                className="w-full border-2 border-amber-700 text-amber-700 py-3.5 rounded-2xl font-bold disabled:opacity-50 active:scale-[0.98] transition-transform"
              >
                Ajouter à ma wishlist
              </button>
            </div>
          )}

          <button
            onClick={reset}
            className="w-full text-sm text-stone-400 font-medium py-2"
          >
            Annuler
          </button>
        </div>
      )}
    </div>
  );
}
