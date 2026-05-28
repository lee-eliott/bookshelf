"use client";

/**
 * Thin re-export of next-view-transitions Link so the rest of the codebase
 * doesn't need to import directly from the package.
 * The ViewTransitions wrapper in layout.tsx coordinates React rendering
 * with document.startViewTransition() so the shared-element animation
 * (book cover morphing from grid → detail) is actually visible.
 */
export { Link as default } from "next-view-transitions";
