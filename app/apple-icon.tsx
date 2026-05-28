import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Only plain divs — no clip-path, no border-triangle tricks (Satori limitations)
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
        {/* Left page */}
        <div style={{ position: "absolute", left: 26, top: 42, width: 59, height: 96, background: "#fefce8" }} />

        {/* Right page (slightly brighter) */}
        <div style={{ position: "absolute", left: 95, top: 42, width: 59, height: 96, background: "#fffbeb" }} />

        {/* Left page lines */}
        <div style={{ position: "absolute", left: 34, top: 68,  width: 44, height: 2, background: "#44403c", opacity: 0.18 }} />
        <div style={{ position: "absolute", left: 34, top: 80,  width: 44, height: 2, background: "#44403c", opacity: 0.18 }} />
        <div style={{ position: "absolute", left: 34, top: 92,  width: 44, height: 2, background: "#44403c", opacity: 0.18 }} />
        <div style={{ position: "absolute", left: 34, top: 104, width: 30, height: 2, background: "#44403c", opacity: 0.18 }} />

        {/* Right page lines */}
        <div style={{ position: "absolute", left: 103, top: 68,  width: 44, height: 2, background: "#44403c", opacity: 0.14 }} />
        <div style={{ position: "absolute", left: 103, top: 80,  width: 44, height: 2, background: "#44403c", opacity: 0.14 }} />
        <div style={{ position: "absolute", left: 103, top: 92,  width: 44, height: 2, background: "#44403c", opacity: 0.14 }} />
        <div style={{ position: "absolute", left: 103, top: 104, width: 30, height: 2, background: "#44403c", opacity: 0.14 }} />

        {/* Amber spine */}
        <div style={{ position: "absolute", left: 85, top: 42, width: 10, height: 96, background: "#f59e0b" }} />

        {/* Amber bookmark — rectangle only, notch omitted (Satori can't render CSS triangles) */}
        <div style={{ position: "absolute", left: 118, top: 8, width: 18, height: 52, background: "#f59e0b" }} />
        {/* Darker left half for depth */}
        <div style={{ position: "absolute", left: 118, top: 8, width: 9, height: 52, background: "#b45309", opacity: 0.25 }} />
      </div>
    ),
    { ...size }
  );
}
