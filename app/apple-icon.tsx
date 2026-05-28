import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

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
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "#fefce8",
            clipPath: "polygon(25px 48px, 90px 43px, 90px 140px, 25px 145px)",
          }}
        />

        {/* Right page (slightly brighter) */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "#fffbeb",
            clipPath: "polygon(155px 48px, 90px 43px, 90px 140px, 155px 145px)",
          }}
        />

        {/* Left page lines */}
        <div style={{ position: "absolute", left: 34, top: 76,  width: 48, height: 2.5, background: "#44403c", borderRadius: 2, opacity: 0.18 }} />
        <div style={{ position: "absolute", left: 34, top: 90,  width: 48, height: 2.5, background: "#44403c", borderRadius: 2, opacity: 0.18 }} />
        <div style={{ position: "absolute", left: 34, top: 104, width: 48, height: 2.5, background: "#44403c", borderRadius: 2, opacity: 0.18 }} />
        <div style={{ position: "absolute", left: 34, top: 118, width: 32, height: 2.5, background: "#44403c", borderRadius: 2, opacity: 0.18 }} />

        {/* Right page lines */}
        <div style={{ position: "absolute", left: 98, top: 76,  width: 48, height: 2.5, background: "#44403c", borderRadius: 2, opacity: 0.14 }} />
        <div style={{ position: "absolute", left: 98, top: 90,  width: 48, height: 2.5, background: "#44403c", borderRadius: 2, opacity: 0.14 }} />
        <div style={{ position: "absolute", left: 98, top: 104, width: 48, height: 2.5, background: "#44403c", borderRadius: 2, opacity: 0.14 }} />
        <div style={{ position: "absolute", left: 98, top: 118, width: 32, height: 2.5, background: "#44403c", borderRadius: 2, opacity: 0.14 }} />

        {/* Amber spine */}
        <div
          style={{
            position: "absolute",
            left: 87,
            top: 43,
            width: 6,
            height: 97,
            borderRadius: 3,
            background: "#f59e0b",
          }}
        />

        {/* Amber bookmark */}
        <div
          style={{
            position: "absolute",
            left: 117,
            top: 8,
            width: 18,
            height: 54,
            background: "#f59e0b",
            clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 50% 86%, 0% 100%)",
          }}
        />
        {/* Bookmark shadow half */}
        <div
          style={{
            position: "absolute",
            left: 117,
            top: 8,
            width: 18,
            height: 54,
            background: "#b45309",
            opacity: 0.22,
            clipPath: "polygon(0% 0%, 50% 0%, 50% 86%, 0% 100%)",
          }}
        />
      </div>
    ),
    { ...size }
  );
}
