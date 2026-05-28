"use client";

import { useState } from "react";

interface Props {
  onConfirm: (name: string) => void;
  onClose: () => void;
}

export default function LendModal({ onConfirm, onClose }: Props) {
  const [name, setName] = useState("");

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50 p-4 pb-8" onClick={onClose}>
      <div
        className="bg-white rounded-2xl p-6 w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-stone-900 mb-4">Prêter ce livre</h2>
        <label className="block text-sm text-stone-600 mb-1.5">Prêté à</label>
        <input
          autoFocus
          type="text"
          placeholder="Nom de la personne"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && name.trim() && onConfirm(name.trim())}
          className="w-full border border-stone-200 rounded-xl px-4 py-3 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-600"
        />
        <div className="flex gap-3 mt-4">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-stone-200 text-stone-600 font-medium text-sm"
          >
            Annuler
          </button>
          <button
            onClick={() => name.trim() && onConfirm(name.trim())}
            disabled={!name.trim()}
            className="flex-1 py-3 rounded-xl bg-amber-700 text-white font-medium text-sm disabled:opacity-40 active:scale-95 transition-transform"
          >
            Confirmer
          </button>
        </div>
      </div>
    </div>
  );
}
