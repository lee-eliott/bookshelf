"use client";

import { useEffect, useRef, useState } from "react";
import type { IScannerControls } from "@zxing/browser";

interface Props {
  onScan: (isbn: string) => void;
  onError?: (error: string) => void;
}

export default function BarcodeScanner({ onScan, onError }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    return () => {
      controlsRef.current?.stop();
    };
  }, []);

  const start = async () => {
    if (!videoRef.current) return;
    setIsStarting(true);

    try {
      const { BrowserMultiFormatReader } = await import("@zxing/browser");
      const reader = new BrowserMultiFormatReader();

      const controls = await reader.decodeFromVideoDevice(
        undefined,
        videoRef.current,
        (result) => {
          if (result) {
            const text = result.getText();
            if (/^97[89]\d{10}$/.test(text) || /^\d{10}$/.test(text)) {
              controls.stop();
              setIsActive(false);
              onScan(text);
            }
          }
        }
      );

      controlsRef.current = controls;
      setIsActive(true);
    } catch {
      onError?.("Impossible d'accéder à la caméra. Vérifiez les permissions.");
    } finally {
      setIsStarting(false);
    }
  };

  const stop = () => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    setIsActive(false);
  };

  return (
    <div className="relative w-full aspect-square max-w-sm mx-auto rounded-2xl overflow-hidden bg-black">
      <video
        ref={videoRef}
        className={`w-full h-full object-cover ${isActive ? "opacity-100" : "opacity-0"}`}
        playsInline
        muted
      />

      {!isActive && !isStarting && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-stone-900">
          <svg viewBox="0 0 24 24" fill="none" className="w-12 h-12 text-stone-400" strokeWidth={1.2}>
            <path
              d="M3 9V5a2 2 0 012-2h4M3 15v4a2 2 0 002 2h4M21 9V5a2 2 0 00-2-2h-4M21 15v4a2 2 0 01-2 2h-4"
              stroke="currentColor" strokeLinecap="round"
            />
            <line x1="7" y1="12" x2="7" y2="12.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            <line x1="12" y1="12" x2="12" y2="12.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            <line x1="17" y1="12" x2="17" y2="12.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
          <button
            onClick={start}
            className="bg-amber-700 text-white px-6 py-3 rounded-full font-medium text-sm active:scale-95 transition-transform"
          >
            Ouvrir la caméra
          </button>
        </div>
      )}

      {isStarting && (
        <div className="absolute inset-0 flex items-center justify-center bg-stone-900">
          <div className="w-8 h-8 border-2 border-amber-700 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {isActive && (
        <>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-48 h-32 border-2 border-white/80 rounded-lg" />
          </div>
          <button
            onClick={stop}
            className="absolute bottom-4 right-4 bg-black/50 text-white px-4 py-2 rounded-full text-sm backdrop-blur-sm"
          >
            Annuler
          </button>
        </>
      )}
    </div>
  );
}
