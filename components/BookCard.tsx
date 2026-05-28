"use client";

import { useRef } from "react";
import Image from "next/image";
import TransitionLink from "./TransitionLink";
import StarRating from "./StarRating";
import { enhanceCoverUrl } from "@/lib/utils";
import type { Book } from "@/lib/types";

export default function BookCard({
  book,
  index = 0,
}: {
  book: Book;
  index?: number;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const coverUrl = enhanceCoverUrl(book.cover_url);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.transition = "transform 0.1s ease, box-shadow 0.12s ease";
    el.style.transform = `perspective(700px) rotateY(${x * 14}deg) rotateX(${-y * 14}deg) scale3d(1.03,1.03,1.03)`;
    el.style.boxShadow = `${-x * 14}px ${y * 10}px 28px rgba(0,0,0,0.16), 0 8px 20px rgba(0,0,0,0.07)`;
  };

  const handlePointerLeave = () => {
    const el = cardRef.current;
    if (!el) return;
    el.style.transition =
      "transform 0.6s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.5s cubic-bezier(0.16,1,0.3,1)";
    el.style.transform =
      "perspective(700px) rotateY(0deg) rotateX(0deg) scale3d(1,1,1)";
    el.style.boxShadow = "0 2px 8px rgba(0,0,0,0.06)";
  };

  // Reset tilt before navigating so the snapshot is clean
  const handlePointerDown = () => {
    const el = cardRef.current;
    if (!el) return;
    el.style.transition = "transform 0.2s ease, box-shadow 0.2s ease";
    el.style.transform = "perspective(700px) rotateY(0deg) rotateX(0deg) scale3d(1,1,1)";
    el.style.boxShadow = "0 2px 8px rgba(0,0,0,0.06)";
  };

  return (
    <TransitionLink
      href={`/book/${book.id}`}
      className="block animate-fade-up"
      style={{ animationDelay: `${index * 55}ms` }}
    >
      <div
        ref={cardRef}
        className="tilt-card bg-white rounded-2xl overflow-hidden border border-stone-100/80"
        style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onPointerDown={handlePointerDown}
      >
        {/* Cover — unique viewTransitionName per book for the shared element animation */}
        <div className="relative w-full aspect-[2/3] bg-stone-100">
          {coverUrl ? (
            <Image
              src={coverUrl}
              alt={book.title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 50vw, 33vw"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-amber-50 via-stone-50 to-amber-100/60">
              <svg viewBox="0 0 24 24" fill="none" className="w-10 h-10 text-amber-300" strokeWidth={1.1}>
                <path d="M8 3H5a2 2 0 00-2 2v14a2 2 0 002 2h3M8 3v18M8 3h8a2 2 0 012 2v14a2 2 0 01-2 2H8" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M16 3h3a2 2 0 012 2v14a2 2 0 01-2 2h-3" stroke="currentColor" strokeLinecap="round" />
              </svg>
            </div>
          )}
        </div>

        <div className="p-3 tilt-inner">
          <p className="font-semibold text-stone-900 text-[13px] leading-snug line-clamp-2">
            {book.title}
          </p>
          {book.author && (
            <p className="text-stone-400 text-[11px] mt-0.5 truncate">{book.author}</p>
          )}
          {book.rating && (
            <div className="mt-1.5">
              <StarRating value={book.rating} readOnly size="sm" />
            </div>
          )}
        </div>
      </div>
    </TransitionLink>
  );
}
