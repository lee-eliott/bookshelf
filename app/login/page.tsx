"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type Mode = "signin" | "signup";

function BookLogo() {
  return (
    <div
      className="w-20 h-20 rounded-3xl flex items-center justify-center relative"
      style={{
        background: "linear-gradient(135deg, #d97706 0%, #92400e 100%)",
        boxShadow: "0 8px 32px rgba(180,83,9,0.35)",
      }}
    >
      <div
        className="absolute inset-0 rounded-3xl"
        style={{
          background:
            "linear-gradient(135deg, rgba(255,255,255,0.18) 0%, transparent 55%)",
        }}
      />
      <svg viewBox="0 0 512 512" className="w-10 h-10 relative z-10">
        <path
          d="M256 130 C215 118 145 124 110 142 L110 370 C145 352 215 346 256 358 C297 346 367 352 402 370 L402 142 C367 124 297 118 256 130Z"
          fill="white"
          opacity="0.95"
        />
        <rect x="248" y="130" width="16" height="228" rx="8" fill="white" opacity="0.35" />
      </svg>
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmationSent, setConfirmationSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();

    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) {
        setError(
          error.message === "User already registered"
            ? "Ce compte existe déjà. Connectez-vous."
            : "Erreur lors de la création du compte."
        );
      } else if (data.session) {
        router.push("/");
        router.refresh();
      } else {
        setConfirmationSent(true);
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError("Email ou mot de passe incorrect.");
      } else {
        router.push("/");
        router.refresh();
      }
    }

    setLoading(false);
  };

  if (confirmationSent) {
    return (
      <div className="min-h-dvh flex flex-col">
        <div
          className="flex flex-col items-center justify-center pt-16 pb-12 px-6"
          style={{
            background: "linear-gradient(160deg, #1c1408 0%, #3d2a12 60%, #5c3d1a 100%)",
          }}
        >
          <BookLogo />
          <h1 className="text-white text-2xl font-bold mt-5 tracking-tight">Bookshelf</h1>
        </div>

        <div className="flex-1 bg-[#fafaf8] rounded-t-3xl -mt-5 relative z-10 flex flex-col justify-center px-6 py-10">
          <div className="max-w-sm mx-auto w-full animate-scale-in">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-amber-50 border border-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.5} className="w-8 h-8 text-amber-700">
                  <path
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-stone-900 mb-2">Vérifiez vos emails</h2>
              <p className="text-sm text-stone-500 leading-relaxed">
                Un lien de confirmation a été envoyé à{" "}
                <span className="font-semibold text-stone-700">{email}</span>.
                Cliquez dessus pour activer votre compte.
              </p>
            </div>
            <button
              onClick={() => {
                setConfirmationSent(false);
                setMode("signin");
              }}
              className="w-full py-3 border border-stone-200 rounded-xl text-sm text-stone-600 font-semibold bg-white active:bg-stone-50 transition-colors"
            >
              Retour à la connexion
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex flex-col">
      {/* ── Brand / Hero ── */}
      <div
        className="flex flex-col items-center justify-center pt-16 pb-12 px-6 relative overflow-hidden"
        style={{
          background: "linear-gradient(160deg, #1c1408 0%, #3d2a12 60%, #5c3d1a 100%)",
        }}
      >
        {/* Decorative ambient glows */}
        <div
          className="absolute -top-20 -right-20 w-56 h-56 rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(circle, rgba(217,119,6,0.18) 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute -bottom-12 -left-16 w-44 h-44 rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(circle, rgba(180,83,9,0.14) 0%, transparent 70%)",
          }}
        />

        <div className="relative z-10 animate-scale-in">
          <BookLogo />
        </div>

        <div className="relative z-10 text-center mt-5 animate-fade-up delay-100">
          <h1 className="text-3xl font-bold text-white tracking-tight">Bookshelf</h1>
          <p className="text-amber-400/60 text-[13px] mt-1.5 font-medium tracking-wide">
            Ma bibliothèque virtuelle
          </p>
        </div>
      </div>

      {/* ── Form ── */}
      <div className="flex-1 bg-[#fafaf8] rounded-t-3xl -mt-5 relative z-10 px-5 pt-8 pb-12">
        <div className="max-w-sm mx-auto animate-fade-up delay-150">
          {/* Mode toggle */}
          <div className="flex bg-stone-100 rounded-xl p-1 mb-7">
            {(["signin", "signup"] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => {
                  setMode(m);
                  setError(null);
                }}
                className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 ${
                  mode === m
                    ? "bg-white text-stone-900 shadow-sm"
                    : "text-stone-400"
                }`}
              >
                {m === "signin" ? "Se connecter" : "Créer un compte"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2">
                Adresse email
              </label>
              <input
                type="email"
                required
                autoComplete="email"
                placeholder="votre@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-stone-200 rounded-xl px-4 py-3 text-stone-900 placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-600/30 focus:border-amber-500/60 bg-white text-sm transition-all"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2">
                Mot de passe
              </label>
              <input
                type="password"
                required
                minLength={6}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                placeholder={mode === "signup" ? "6 caractères minimum" : "••••••••"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-stone-200 rounded-xl px-4 py-3 text-stone-900 placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-600/30 focus:border-amber-500/60 bg-white text-sm transition-all"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 animate-fade-in">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full bg-amber-700 text-white py-3.5 rounded-xl font-bold disabled:opacity-40 active:scale-[0.98] transition-all duration-150 mt-2"
              style={{ boxShadow: "0 4px 20px rgba(180,83,9,0.28)" }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2.5">
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  {mode === "signup" ? "Création…" : "Connexion…"}
                </span>
              ) : mode === "signup" ? (
                "Créer mon compte"
              ) : (
                "Se connecter"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
