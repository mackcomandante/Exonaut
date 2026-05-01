// Shared UI primitives: avatars, badge medallions, small bits.

// ---- Geometric avatar generator ----
// Hash-seeded deterministic geometric avatar. No photos.

function hashName(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return h;
}

function avatarPalette(seed) {
  // Pull from brand palette with subtle variation
  const palettes = [
    { bg: '#F0F9D4', fg: '#1B1930', accent: '#8FBF15' },
    { bg: '#E8ECFF', fg: '#1B1930', accent: '#4C63FF' },
    { bg: '#F9E7FC', fg: '#1B1930', accent: '#C53FD4' },
    { bg: '#FFF1DE', fg: '#1B1930', accent: '#FF8A2B' },
    { bg: '#FFE6E6', fg: '#1B1930', accent: '#FF6B6B' },
    { bg: '#DCF6FC', fg: '#1B1930', accent: '#2FC8E6' },
    { bg: '#EDE4FE', fg: '#1B1930', accent: '#8B5CF6' },
    { bg: '#FFF3CE', fg: '#1B1930', accent: '#F4B81C' },
  ];
  return palettes[seed % palettes.length];
}

function GeometricAvatar({ name = '', size = 48, seedOverride }) {
  const seed = seedOverride ?? hashName(name);
  const pal = avatarPalette(seed);
  // Variant shape: 0..5
  const variant = seed % 6;
  const initials = name.split(' ').filter(Boolean).slice(0, 2).map(s => s[0]).join('').toUpperCase();

  // Rotation
  const rot = (seed >> 3) % 4 * 90;

  let mark;
  if (variant === 0) {
    // Diagonal split
    mark = (
      <>
        <polygon points="0,0 100,0 100,100" fill={pal.fg} opacity="0.28" />
        <circle cx="50" cy="50" r="26" fill={pal.fg} opacity="0.95" />
      </>
    );
  } else if (variant === 1) {
    // Concentric rings
    mark = (
      <>
        <circle cx="50" cy="50" r="42" fill="none" stroke={pal.fg} strokeWidth="2" opacity="0.35" />
        <circle cx="50" cy="50" r="28" fill="none" stroke={pal.accent} strokeWidth="1.5" opacity="0.6" />
        <circle cx="50" cy="50" r="14" fill={pal.fg} />
      </>
    );
  } else if (variant === 2) {
    // Bars
    mark = (
      <g transform={`rotate(${rot} 50 50)`}>
        <rect x="20" y="20" width="14" height="60" fill={pal.fg} opacity="0.9" />
        <rect x="42" y="35" width="14" height="45" fill={pal.accent} opacity="0.7" />
        <rect x="64" y="25" width="14" height="55" fill={pal.fg} opacity="0.5" />
      </g>
    );
  } else if (variant === 3) {
    // Triangle tessellation
    mark = (
      <g transform={`rotate(${rot} 50 50)`}>
        <polygon points="50,18 82,70 18,70" fill={pal.fg} opacity="0.85" />
        <polygon points="50,50 82,70 18,70" fill={pal.accent} opacity="0.6" />
      </g>
    );
  } else if (variant === 4) {
    // Orbits
    mark = (
      <g>
        <ellipse cx="50" cy="50" rx="38" ry="14" fill="none" stroke={pal.fg} strokeWidth="1.5" opacity="0.5" transform="rotate(-25 50 50)" />
        <ellipse cx="50" cy="50" rx="38" ry="14" fill="none" stroke={pal.accent} strokeWidth="1.5" opacity="0.5" transform="rotate(30 50 50)" />
        <circle cx="50" cy="50" r="10" fill={pal.fg} />
      </g>
    );
  } else {
    // Grid dots
    mark = (
      <g>
        {[0,1,2,3].map(r => [0,1,2,3].map(c => {
          const on = ((seed >> (r*4 + c)) & 1) === 1;
          return (
            <rect key={`${r}-${c}`} x={22 + c * 16} y={22 + r * 16} width="10" height="10"
              fill={on ? pal.fg : pal.accent} opacity={on ? 0.9 : 0.25} />
          );
        }))}
      </g>
    );
  }

  return (
    <div className="avatar" style={{ width: size, height: size }}>
      <div className="avatar-inner" style={{ background: pal.bg }}>
        <svg viewBox="0 0 100 100" width={size} height={size}>
          {mark}
        </svg>
      </div>
    </div>
  );
}

function AvatarWithRing({ name, size = 48, tier, showInitials = false, photoUrl }) {
  const ringClass = 'avatar-ring avatar-ring-' + (tier || 'entry');
  return (
    <div style={{ position: 'relative', width: size, height: size, display: 'inline-block', flexShrink: 0 }}>
      {photoUrl
        ? <img src={photoUrl} alt={name} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', display: 'block' }} />
        : <GeometricAvatar name={name} size={size} />
      }
      <div className={ringClass} />
    </div>
  );
}

// ---- Badge medallion ----
// SVG medallion for each badge — data-driven
function BadgeMedallion({ badge, size = 60, animated = false }) {
  const color = badge.color || '#C9F24A';
  const label = (badge.code || '').split('-')[1] || '';
  const catMap = {
    milestone: { icon: 'M30 6 L44 18 L42 36 L30 46 L18 36 L16 18 Z', label: 'MILESTONE' },
    track:     { icon: 'M30 6 L52 20 L52 40 L30 54 L8 40 L8 20 Z',   label: 'TRACK'     },
    pillar:    { icon: 'M10 10 H50 V50 H10 Z',                       label: 'PILLAR'    },
    special:   { icon: 'M30 4 L38 22 L58 22 L42 34 L48 54 L30 42 L12 54 L18 34 L2 22 L22 22 Z', label: 'SPECIAL' },
  };
  const cat = catMap[badge.category] || catMap.milestone;
  return (
    <svg viewBox="0 0 60 60" width={size} height={size} style={{ overflow: 'visible' }}>
      <defs>
        <radialGradient id={'bg-' + badge.code} cx="50%" cy="40%">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </radialGradient>
      </defs>
      {animated && (
        <circle cx="30" cy="30" r="29" fill="none" stroke={color} strokeWidth="0.5" opacity="0.4">
          <animate attributeName="r" from="29" to="42" dur="2s" repeatCount="indefinite" />
          <animate attributeName="opacity" from="0.6" to="0" dur="2s" repeatCount="indefinite" />
        </circle>
      )}
      <circle cx="30" cy="30" r="28" fill={`url(#bg-${badge.code})`} />
      <path d={cat.icon} fill="none" stroke={color} strokeWidth="1.5" opacity="0.85" />
      <circle cx="30" cy="30" r="10" fill={color} />
      <text x="30" y="33" fontFamily="JetBrains Mono, monospace" fontSize="7" fontWeight="700"
        textAnchor="middle" fill="#2D0A28">{label}</text>
    </svg>
  );
}

// ---- Tier crest ----
function TierCrest({ tier, size = 14 }) {
  const t = TIERS[tier] || TIERS.entry;
  return (
    <span className={'tier-tag tier-' + tier} style={{ color: t.color }}>
      {t.short}
    </span>
  );
}

// ---- Change arrow ----
function ChangeArrow({ n }) {
  if (n > 0) return <span className="lb-change up">▲ {n}</span>;
  if (n < 0) return <span className="lb-change down">▼ {Math.abs(n)}</span>;
  return <span className="lb-change flat">— 0</span>;
}

// ---- Export ----
Object.assign(window, {
  GeometricAvatar, AvatarWithRing, BadgeMedallion, TierCrest, ChangeArrow,
});
