import { ImageResponse } from "next/og";

const GOLD = "#C9A84C";
const DARK = "#0F1117";
const MUTED = "#7A8299";

export const ogSize = { width: 1200, height: 630 };
export const ogContentType = "image/png";

export function generateOgImage({
  title,
  titleAr,
  description,
}: {
  title: string;
  titleAr: string;
  description: string;
}) {
  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          background: DARK,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Top accent line */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            background: GOLD,
          }}
        />

        {/* Mizan branding */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 32,
          }}
        >
          <svg
            width="32"
            height="32"
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <line x1="16" y1="6" x2="16" y2="28" stroke={GOLD} strokeWidth="1.5" strokeLinecap="round" />
            <line x1="10" y1="28" x2="22" y2="28" stroke={GOLD} strokeWidth="1.5" strokeLinecap="round" />
            <polygon points="16,4 13,8 19,8" fill={GOLD} />
            <line x1="6" y1="10" x2="26" y2="10" stroke={GOLD} strokeWidth="1.5" strokeLinecap="round" />
            <path d="M3 16 Q6 19 9 16" stroke={GOLD} strokeWidth="1.5" strokeLinecap="round" fill="none" />
            <path d="M23 16 Q26 19 29 16" stroke={GOLD} strokeWidth="1.5" strokeLinecap="round" fill="none" />
          </svg>
          <div style={{ fontSize: 20, color: GOLD, fontWeight: 600 }}>
            Mizan
          </div>
        </div>

        {/* Page title */}
        <div
          style={{
            fontSize: 56,
            fontWeight: 800,
            color: "#E8ECF4",
            letterSpacing: "-0.02em",
            textAlign: "center",
            maxWidth: 900,
          }}
        >
          {title}
        </div>

        {/* Arabic title */}
        <div
          style={{
            fontSize: 32,
            color: GOLD,
            marginTop: 8,
            textAlign: "center",
          }}
        >
          {titleAr}
        </div>

        {/* Description */}
        <div
          style={{
            fontSize: 20,
            color: MUTED,
            marginTop: 20,
            textAlign: "center",
            maxWidth: 700,
          }}
        >
          {description}
        </div>

        {/* URL */}
        <div
          style={{
            position: "absolute",
            bottom: 24,
            fontSize: 14,
            color: MUTED,
          }}
        >
          mizanmasr.com
        </div>
      </div>
    ),
    { ...ogSize }
  );
}
