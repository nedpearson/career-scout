import { ImageResponse } from "next/og";

export const runtime = "nodejs";

export const size = {
  width: 64,
  height: 64
};

export const contentType = "image/png";

export default function Icon() {
  // Keep colors aligned with `src/styles/tokens.css` (HSL, no hex).
  const bg = "hsl(222 64% 6%)";
  const primary = "hsl(214 100% 62%)";
  const success = "hsl(142 86% 50%)";
  const accent = "hsl(27 96% 60%)";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: bg
        }}
      >
        <svg width="46" height="46" viewBox="0 0 32 32">
          {/* Orbit swoosh */}
          <path
            d="M6.6 12.1c2.5-4.8 7.3-8 13.0-8 2.2 0 4.3.5 6.2 1.4"
            fill="none"
            stroke={primary}
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.95"
          />
          <path
            d="M25.7 5.6l.8 3.6-3.5-.9"
            fill="none"
            stroke={primary}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.95"
          />

          {/* Briefcase */}
          <path
            d="M8.6 11.2c0-1 .8-1.8 1.8-1.8h11.2c1 0 1.8.8 1.8 1.8v10.2c0 1-.8 1.8-1.8 1.8H10.4c-1 0-1.8-.8-1.8-1.8V11.2z"
            fill="hsl(222 46% 10%)"
            stroke="hsl(220 28% 18%)"
            strokeWidth="1.5"
          />
          <path
            d="M11 9.5c0-1 .8-1.8 1.8-1.8h6.4c1 0 1.8.8 1.8 1.8v1.2h-2.1V10c0-.4-.3-.7-.7-.7h-5.4c-.4 0-.7.3-.7.7v.7H11V9.5z"
            fill="hsl(210 40% 98%)"
            opacity="0.9"
          />

          {/* Check */}
          <path
            d="M12.3 16.8l2.1 2.2 5-5.2"
            fill="none"
            stroke={success}
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Sparkle */}
          <path
            d="M25.8 12.8l.6 1.6 1.6.6-1.6.6-.6 1.6-.6-1.6-1.6-.6 1.6-.6.6-1.6z"
            fill={accent}
          />
        </svg>
      </div>
    ),
    { ...size }
  );
}

