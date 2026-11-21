export function TitleEmblem() {
  return (
    <div className="select-none w-full max-w-[490px]">
      <svg
        viewBox="0 0 540 148"
        className="w-full h-auto drop-shadow-[0_10px_22px_rgba(4,3,2,0.92)]"
        role="img"
        aria-label="The Blight — Inhuman"
      >
        <defs>
          <linearGradient id="blightGoldTop" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FEF3C7" />
            <stop offset="45%" stopColor="#F59E0B" />
            <stop offset="82%" stopColor="#B45309" />
            <stop offset="100%" stopColor="#78350F" />
          </linearGradient>
          <linearGradient id="blightIronTrim" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#78350F" />
            <stop offset="50%" stopColor="#FDE68A" />
            <stop offset="100%" stopColor="#78350F" />
          </linearGradient>
          <linearGradient id="blightStonePlaque" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#26201C" />
            <stop offset="100%" stopColor="#120F0D" />
          </linearGradient>
        </defs>

        {/* Weathered Gothic Stone & Iron Crest */}
        <polygon
          points="26,22 508,22 528,44 528,118 498,136 16,136 6,116 6,42"
          fill="url(#blightStonePlaque)"
          stroke="url(#blightIronTrim)"
          strokeWidth="3"
        />
        <polygon
          points="32,28 502,28 520,46 520,112 494,129 22,129 14,113 14,45"
          fill="none"
          stroke="#574B42"
          strokeWidth="1.5"
        />

        {/* Corner Iron & Blight-Emerald Rivets */}
        <polygon points="24,42 30,36 36,42 30,48" fill="#D97706" />
        <polygon points="502,42 508,36 514,42 508,48" fill="#D97706" />
        <polygon points="24,114 30,108 36,114 30,120" fill="#84CC16" />
        <polygon points="502,114 508,108 514,114 508,120" fill="#84CC16" />

        {/* Extruded Shadow Layer */}
        <text
          x="268"
          y="86"
          textAnchor="middle"
          fontFamily="'Press Start 2P', monospace"
          fontSize="37"
          fill="#0B0908"
          stroke="#0B0908"
          strokeWidth="10"
          strokeLinejoin="round"
        >
          THE BLIGHT
        </text>

        {/* Main Burnished Iron & Amber Wordmark */}
        <text
          x="266"
          y="82"
          textAnchor="middle"
          fontFamily="'Press Start 2P', monospace"
          fontSize="37"
          fill="url(#blightGoldTop)"
          stroke="#1C1510"
          strokeWidth="2.5"
          strokeLinejoin="round"
        >
          THE BLIGHT
        </text>

        {/* Bottom Iron Rule + Permanent Hero Plate: INHUMAN */}
        <rect x="44" y="100" width="152" height="3" fill="#D97706" />
        <rect x="342" y="100" width="152" height="3" fill="#D97706" />

        <polygon
          points="204,92 334,92 344,105 334,118 204,118 194,105"
          fill="#161210"
          stroke="#84CC16"
          strokeWidth="2"
        />
        <text
          x="269"
          y="110"
          textAnchor="middle"
          fontFamily="'Press Start 2P', monospace"
          fontSize="13"
          fill="#ECFCCB"
          letterSpacing="2"
        >
          INHUMAN
        </text>
      </svg>
    </div>
  );
}
