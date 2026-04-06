import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Mizan — Egypt, visualized.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const GOLD = "#C9A84C";
const DARK = "#0F1117";
const SURFACE = "#181C25";
const MUTED = "#7A8299";

const ARABIC_FONT_URL =
  "https://fonts.gstatic.com/s/cairo/v31/SLXgc1nY6HkvangtZmpQdkhzfH5lkSs2SgRjCAGMQ1z0hAc5W1Q.ttf";

export default async function OgImage() {
  const arabicFont = await fetch(ARABIC_FONT_URL).then((r) => r.arrayBuffer());

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

        {/* Scales icon */}
        <svg
          width="64"
          height="64"
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <line x1="16" y1="6" x2="16" y2="28" stroke={GOLD} strokeWidth="1.5" strokeLinecap="round" />
          <line x1="10" y1="28" x2="22" y2="28" stroke={GOLD} strokeWidth="1.5" strokeLinecap="round" />
          <polygon points="16,4 13,8 19,8" fill={GOLD} />
          <line x1="6" y1="10" x2="26" y2="10" stroke={GOLD} strokeWidth="1.5" strokeLinecap="round" />
          <line x1="7" y1="10" x2="6" y2="16" stroke={GOLD} strokeWidth="1" strokeLinecap="round" />
          <line x1="25" y1="10" x2="26" y2="16" stroke={GOLD} strokeWidth="1" strokeLinecap="round" />
          <path d="M3 16 Q6 19 9 16" stroke={GOLD} strokeWidth="1.5" strokeLinecap="round" fill="none" />
          <path d="M23 16 Q26 19 29 16" stroke={GOLD} strokeWidth="1.5" strokeLinecap="round" fill="none" />
        </svg>

        {/* Title */}
        <div
          style={{
            fontSize: 72,
            fontWeight: 900,
            color: "#E8ECF4",
            marginTop: 24,
            letterSpacing: "-0.02em",
          }}
        >
          Mizan
        </div>

        {/* Arabic name */}
        <div
          style={{
            fontSize: 36,
            color: GOLD,
            marginTop: 4,
            fontFamily: "Cairo",
            direction: "rtl",
          }}
        >
          ميزان
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 24,
            color: MUTED,
            marginTop: 20,
          }}
        >
          Egypt, visualized.
        </div>

        {/* Stats bar */}
        <div
          style={{
            display: "flex",
            gap: 48,
            marginTop: 40,
            padding: "16px 32px",
            background: SURFACE,
            borderRadius: 12,
            border: "1px solid #252A36",
          }}
        >
          {[
            { value: "596", label: "Parliament" },
            { value: "247", label: "Articles" },
            { value: "27", label: "Governorates" },
            { value: "$155B", label: "Ext. Debt" },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 700,
                  color: "#E8ECF4",
                  fontFamily: "monospace",
                }}
              >
                {stat.value}
              </div>
              <div style={{ fontSize: 12, color: MUTED, marginTop: 4 }}>
                {stat.label}
              </div>
            </div>
          ))}
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
    {
      ...size,
      fonts: [
        {
          name: "Cairo",
          data: arabicFont,
          style: "normal",
          weight: 700,
        },
      ],
    }
  );
}
