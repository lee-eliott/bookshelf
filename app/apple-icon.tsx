import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Satori (ImageResponse engine) has limited CSS support — no clip-path.
// The book is rebuilt with plain divs + CSS border-triangle for the bookmark notch.
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          background: "#1c1917",
          borderRadius: 40,
          position: "relative",
          display: "flex",
          overflow: "hidden",
        }}
      >
        {/* ── Left page ── */}
        <div
          style={{
            position: "absolute",
            left: 26,
            top: 42,
            width: 59,
            height: 96,
            background: "#fefce8",
          }}
        />

        {/* ── Right page ── */}
        <div
          style={{
            position: "absolute",
            left: 95,
            top: 42,
            width: 59,
            height: 96,
            background: "#fffbeb",
          }}
        />

        {/* ── Left page lines ── */}
        <div style={{ position: "absolute", left: 34, top: 68,  width: 44, height: 2, background: "#44403c", opacity: 0.18 }} />
        <div style={{ position: "absolute", left: 34, top: 80,  width: 44, height: 2, background: "#44403c", opacity: 0.18 }} />
        <div style={{ position: "absolute", left: 34, top: 92,  width: 44, height: 2, background: "#44403c", opacity: 0.18 }} />
        <div style={{ position: "absolute", left: 34, top: 104, width: 30, height: 2, background: "#44403c", opacity: 0.18 }} />

        {/* ── Right page lines ── */}
        <div style={{ position: "absolute", left: 103, top: 68,  width: 44, height: 2, background: "#44403c", opacity: 0.14 }} />
        <div style={{ position: "absolute", left: 103, top: 80,  width: 44, height: 2, background: "#44403c", opacity: 0.14 }} />
        <div style={{ position: "absolute", left: 103, top: 92,  width: 44, height: 2, background: "#44403c", opacity: 0.14 }} />
        <div style={{ position: "absolute", left: 103, top: 104, width: 30, height: 2, background: "#44403c", opacity: 0.14 }} />

        {/* ── Amber spine ── */}
        <div
          style={{
            position: "absolute",
            left: 85,
            top: 42,
            width: 10,
            height: 96,
            background: "#f59e0b",
          }}
        />

        {/* ── Amber bookmark (rectangle + CSS triangle notch) ── */}
        <div
          style={{
            position: "absolute",
            left: 118,
            top: 8,
            width: 18,
            height: 50,
            background: "#f59e0b",
          }}
        />
        {/* Notch: dark upward triangle overlapping the bottom of the bookmark */}
        <div
          style={{
            position: "absolute",
            left: 118,
            top: 50,
            width: 0,
            height: 0,
            borderLeft: "9px solid transparent",
            borderRight: "9px solid transparent",
            borderBottom: "8px solid #1c1917",
          }}
        />
      </div>
    ),
    { ...size }
  );
}
