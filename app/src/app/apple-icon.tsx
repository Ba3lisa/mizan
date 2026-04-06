import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

const GOLD = '#C9A84C'
const DARK = '#0A0A0A'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          background: DARK,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg
          width="120"
          height="120"
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Vertical pillar */}
          <line
            x1="16" y1="6" x2="16" y2="28"
            stroke={GOLD} strokeWidth="1.5" strokeLinecap="round"
          />
          {/* Base */}
          <line
            x1="10" y1="28" x2="22" y2="28"
            stroke={GOLD} strokeWidth="1.5" strokeLinecap="round"
          />
          {/* Fulcrum triangle */}
          <polygon points="16,4 13,8 19,8" fill={GOLD} />
          {/* Horizontal beam */}
          <line
            x1="6" y1="10" x2="26" y2="10"
            stroke={GOLD} strokeWidth="1.5" strokeLinecap="round"
          />
          {/* Left arm rope */}
          <line
            x1="7" y1="10" x2="6" y2="16"
            stroke={GOLD} strokeWidth="1" strokeLinecap="round"
          />
          {/* Right arm rope */}
          <line
            x1="25" y1="10" x2="26" y2="16"
            stroke={GOLD} strokeWidth="1" strokeLinecap="round"
          />
          {/* Left pan */}
          <path
            d="M3 16 Q6 19 9 16"
            stroke={GOLD} strokeWidth="1.5" strokeLinecap="round" fill="none"
          />
          {/* Right pan */}
          <path
            d="M23 16 Q26 19 29 16"
            stroke={GOLD} strokeWidth="1.5" strokeLinecap="round" fill="none"
          />
        </svg>
      </div>
    ),
    { ...size }
  )
}
