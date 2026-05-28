"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const AVATAR_COLORS = [
  { value: "#b45309", label: "Ambre" },
  { value: "#0f766e", label: "Teal" },
  { value: "#7c3aed", label: "Violet" },
  { value: "#be123c", label: "Rose" },
  { value: "#0369a1", label: "Bleu" },
  { value: "#374151", label: "Ardoise" },
];

export default function ProfilPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [avatarColor, setAvatarColor] = useState(AVATAR_COLORS[0].value);
  const [bookCount, setBookCount] = useState<number | null>(null);
  const [wishCount, setWishCount] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      setEmail(user.email ?? "");
      setDisplayName(user.user_metadata?.display_name ?? "");
      setAvatarColor(user.user_metadata?.avatar_color ?? AVATAR_COLORS[0].value);

      // Stats
      const [{ count: bc }, { count: wc }] = await Promise.all([
        supabase.from("books").select("*", { count: "exact", head: true }),
        supabase.from("wishlist").select("*", { count: "exact", head: true }),
      ]);
      setBookCount(bc ?? 0);
      setWishCount(wc ?? 0);
      setLoading(false);
    };
    load();
  }, [router]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    const supabase = createClient();
    await supabase.auth.updateUser({
      data: { display_name: displayName.trim(), avatar_color: avatarColor },
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  const initial = (displayName || email).charAt(0).toUpperCase();

  if (loading) {
    return (
      <div className="max-w-lg mx-auto px-4 pt-14">
        <div className="flex flex-col items-center gap-4 py-12">
          <div className="shimmer w-20 h-20 rounded-full" />
          <div className="shimmer h-5 w-32 rounded-full" />
          <div className="shimmer h-3.5 w-44 rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 animate-fade-up">
      {/* ── Header ── */}
      <div className="pt-14 pb-6">
        <p className="text-[10px] font-bold text-amber-700 tracking-widest uppercase mb-1.5">
          Mon compte
        </p>
        <h1 className="text-3xl font-bold text-stone-900 leading-none">Profil</h1>
      </div>

      {/* ── Avatar + Identity ── */}
      <div className="flex flex-col items-center py-6 animate-scale-in">
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-lg mb-3 transition-colors duration-300"
          style={{ background: `linear-gradient(135deg, ${avatarColor}dd, ${avatarColor})` }}
        >
          {initial}
        </div>
        <p className="font-bold text-stone-900 text-lg leading-tight">
          {displayName || "Sans nom"}
        </p>
        <p className="text-stone-400 text-sm mt-0.5">{email}</p>

        {/* Stats */}
        <div className="flex gap-6 mt-5">
          <div className="text-center">
            <p className="text-2xl font-bold text-stone-900 tabular-nums">{bookCount ?? "—"}</p>
            <p className="text-[11px] text-stone-400 font-medium">livre{bookCount !== 1 ? "s" : ""}</p>
          </div>
          <div className="w-px bg-stone-100" />
          <div className="text-center">
            <p className="text-2xl font-bold text-stone-900 tabular-nums">{wishCount ?? "—"}</p>
            <p className="text-[11px] text-stone-400 font-medium">souhait{wishCount !== 1 ? "s" : ""}</p>
          </div>
        </div>
      </div>

      {/* ── Edit form ── */}
      <div className="space-y-5 mt-2">
        {/* Display name */}
        <div className="bg-white rounded-2xl border border-stone-100 p-4" style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
          <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2.5">
            Nom affiché
          </label>
          <input
            type="text"
            placeholder="Comment vous appelle-t-on ?"
            value={displayName}
            onChange={(e) => { setDisplayName(e.target.value); setSaved(false); }}
            className="w-full text-stone-900 placeholder:text-stone-300 text-sm focus:outline-none bg-transparent"
          />
        </div>

        {/* Avatar color */}
        <div className="bg-white rounded-2xl border border-stone-100 p-4" style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
          <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-3">
            Couleur de l&apos;avatar
          </p>
          <div className="flex gap-2.5">
            {AVATAR_COLORS.map((c) => (
              <button
                key={c.value}
                onClick={() => { setAvatarColor(c.value); setSaved(false); }}
                className="relative w-9 h-9 rounded-full transition-transform active:scale-90"
                style={{ background: c.value }}
                title={c.label}
              >
                {avatarColor === c.value && (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <svg viewBox="0 0 24 24" fill="none" strokeWidth={3} className="w-4 h-4 text-white">
                      <path d="M5 13l4 4L19 7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-amber-700 text-white py-3.5 rounded-2xl font-bold disabled:opacity-50 active:scale-[0.98] transition-all text-sm"
          style={{ boxShadow: "0 4px 16px rgba(180,83,9,0.25)" }}
        >
          {saving ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              Enregistrement…
            </span>
          ) : saved ? (
            <span className="flex items-center justify-center gap-2">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth={2.5} className="w-4 h-4">
                <path d="M5 13l4 4L19 7" stroke="white" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Enregistré
            </span>
          ) : (
            "Enregistrer"
          )}
        </button>
      </div>

      {/* ── Sign out ── */}
      <div className="mt-6 pb-4">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-stone-200 text-stone-500 font-medium text-sm active:bg-stone-50 transition-colors"
        >
          <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" strokeWidth={1.8}>
            <path
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Se déconnecter
        </button>
      </div>
    </div>
  );
}
