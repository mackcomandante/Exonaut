// Badge primitives — reusable SVG medallions and certificate components.
// All dimensions are normalized to a 1200×1200 export canvas; scale with CSS.

// ---------- Color ramps per category ----------
// Milestone tiers use metallic ramps; tracks/pillars/special use brand color on ink.
const METAL_RAMPS = {
  bronze:   { base: '#CD7F32', deep: '#7A3F10', hi: '#F4D4A8', engrave: '#4A2808' },
  silver:   { base: '#BFC7CE', deep: '#5E6870', hi: '#F1F4F6', engrave: '#2E3439' },
  gold:     { base: '#D4A84A', deep: '#8A6112', hi: '#FBEFC4', engrave: '#3A2708' },
  platinum: { base: '#C9D7DF', deep: '#6E8390', hi: '#F6FAFC', engrave: '#243239' },
};

// Monograms per badge code — simple, editorial.
const MONOGRAMS = {
  'MIL-BRZ': 'I',   'MIL-SLV': 'II',  'MIL-GLD': 'III', 'MIL-PLT': 'IV',
  'TRK-AIS': 'AI',  'TRK-VB': 'VB',   'TRK-LD': 'LD',   'TRK-XM': 'XM',
  'TRK-AID': 'AD',  'TRK-POL': 'PA',  'TRK-CC': 'CC',
  'PIL-DLV': 'DM',  'PIL-INN': 'IC',  'PIL-CLT': 'CH',  'PIL-TAL': 'TS',
  'SPL-TRI': '△',   'SPL-MVP': 'MVP', 'SPL-IOW': 'W',   'SPL-DIS': '∞',
  'SPL-CLT': '✶',   'SPL-FUL': 'FC',  'SPL-PIP': '→',
};

// ---------- The hero sample: AI Strategist track badge ----------
// Editorial medallion — clean, professional, not kitschy.
function BadgeMedallion({
  code = 'TRK-AIS',
  name = 'AI Strategist',
  subtitle = 'AI Strategy Track',
  cohortLabel = 'COHORT 04 · 2026',
  holder = 'Maya Okonkwo',
  color = '#C9F24A',
  surface = 'ink',           // 'ink' | 'paper' | 'metal-gold' | 'metal-silver' | 'metal-bronze' | 'metal-platinum'
  monogram,
  size = 420,
  issueId = 'EXO-BDG-042',
  dateLabel = 'OCT 2026',
  showHolder = true,
  locked = false,
}) {
  const glyph = monogram || MONOGRAMS[code] || '◆';

  // Surface palette — drives ring, field, ink colors.
  const isInk   = surface === 'ink';
  const isPaper = surface === 'paper';
  const metal   = surface.startsWith('metal-') ? METAL_RAMPS[surface.split('-')[1]] : null;

  const ringOuter  = isInk ? '#14161A' : isPaper ? '#F5F2EC' : metal.deep;
  const ringMid    = isInk ? '#1E2126' : isPaper ? '#E8E2D6' : metal.base;
  const ringInner  = isInk ? '#0D0F12' : isPaper ? '#F5F2EC' : metal.deep;
  const fieldBg    = isInk ? '#0A0B0E' : isPaper ? '#FBF8F2' : metal.base;
  const inkColor   = isInk ? '#F5F2EC' : isPaper ? '#14161A' : metal.engrave;
  const accent     = metal ? metal.hi : color;
  const microInk   = isInk ? 'rgba(245,242,236,0.55)' : isPaper ? 'rgba(20,22,26,0.55)' : metal.engrave;

  // Layout (SVG 500×500 viewBox).
  const R_OUTER = 240;   // outer rim radius
  const R_BAND  = 220;   // micro-text band radius
  const R_RING  = 200;   // inner ring edge
  const R_FIELD = 184;   // central disc edge

  // Compose repeated micro-text for the rotating band.
  const micro = ` ${holder.toUpperCase()}  ·  ${cohortLabel}  ·  ${issueId}  ·  ${dateLabel}  ·  EXOASIA  ·  EXONAUT CORPS  ·`;
  const microRepeat = (micro + micro).slice(0, 180);

  const uid = React.useMemo(() => 'b' + Math.random().toString(36).slice(2, 8), []);

  return (
    <svg width={size} height={size} viewBox="0 0 500 500" xmlns="http://www.w3.org/2000/svg"
         style={{
           display: 'block',
           fontFamily: 'var(--font-display, "Space Grotesk", sans-serif)',
           filter: locked ? 'saturate(0.08) brightness(0.85) contrast(0.9)' : 'none',
           opacity: locked ? 0.55 : 1,
         }}>
      <defs>
        {/* Outer rim — layered metallic / ink gradient */}
        <radialGradient id={`${uid}-rim`} cx="35%" cy="30%" r="85%">
          <stop offset="0%"  stopColor={metal ? metal.hi : isInk ? '#2B2F36' : '#FFFFFF'} />
          <stop offset="55%" stopColor={ringOuter} />
          <stop offset="100%" stopColor={metal ? metal.deep : isInk ? '#05060A' : '#D9D2C3'} />
        </radialGradient>
        {/* Brushed micro-texture */}
        <linearGradient id={`${uid}-brush`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"  stopColor="rgba(255,255,255,0.00)" />
          <stop offset="50%" stopColor="rgba(255,255,255,0.10)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.00)" />
        </linearGradient>
        {/* Central field — subtle radial */}
        <radialGradient id={`${uid}-field`} cx="50%" cy="45%" r="70%">
          <stop offset="0%"  stopColor={isInk ? '#1A1D22' : isPaper ? '#FFFDF6' : (metal?.hi || '#FFF')} />
          <stop offset="100%" stopColor={fieldBg} />
        </radialGradient>
        {/* Accent glow ring */}
        <radialGradient id={`${uid}-glow`} cx="50%" cy="50%" r="50%">
          <stop offset="65%" stopColor="transparent" />
          <stop offset="85%" stopColor={accent} stopOpacity="0.18" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
        {/* Inner bevel */}
        <radialGradient id={`${uid}-bevel`} cx="50%" cy="30%" r="70%">
          <stop offset="0%"  stopColor="rgba(255,255,255,0.18)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.25)" />
        </radialGradient>

        {/* Circular path for rotating micro-text */}
        <path id={`${uid}-micro`}
              d={`M 250 ${250 - R_BAND} a ${R_BAND} ${R_BAND} 0 1 1 -0.01 0`} />
      </defs>

      {/* Outer rim */}
      <circle cx="250" cy="250" r={R_OUTER} fill={`url(#${uid}-rim)`} />
      <circle cx="250" cy="250" r={R_OUTER} fill={`url(#${uid}-brush)`} opacity="0.6" />

      {/* Accent glow halo */}
      <circle cx="250" cy="250" r={R_OUTER} fill={`url(#${uid}-glow)`} />

      {/* Micro-text band */}
      <circle cx="250" cy="250" r={R_BAND + 10} fill="none"
              stroke={microInk} strokeWidth="0.4" opacity="0.4" />
      <circle cx="250" cy="250" r={R_BAND - 10} fill="none"
              stroke={microInk} strokeWidth="0.4" opacity="0.4" />
      <text fill={microInk} style={{
        fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
        fontSize: 8.2, letterSpacing: '0.18em', fontWeight: 500,
      }}>
        <textPath href={`#${uid}-micro`}>{microRepeat}</textPath>
      </text>

      {/* Inner bevel ring */}
      <circle cx="250" cy="250" r={R_RING} fill={ringInner} />
      <circle cx="250" cy="250" r={R_RING - 2} fill="none"
              stroke={accent} strokeWidth="0.6" opacity="0.7" />

      {/* Central field */}
      <circle cx="250" cy="250" r={R_FIELD} fill={`url(#${uid}-field)`} />
      <circle cx="250" cy="250" r={R_FIELD} fill={`url(#${uid}-bevel)`} opacity="0.35" />

      {/* Thin accent stripe at top of field */}
      <path d={`M ${250 - 90} ${250 - R_FIELD + 34} L ${250 + 90} ${250 - R_FIELD + 34}`}
            stroke={accent} strokeWidth="1.2" opacity="0.85" strokeLinecap="round" />
      <path d={`M ${250 - 6} ${250 - R_FIELD + 28} L ${250 + 6} ${250 - R_FIELD + 28}`}
            stroke={accent} strokeWidth="1.4" opacity="1" strokeLinecap="round" />

      {/* EXOASIA monogram at top of field */}
      <text x="250" y={250 - R_FIELD + 58} textAnchor="middle" fill={inkColor} opacity="0.6"
            style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 9, letterSpacing: '0.3em', fontWeight: 600 }}>
        EXOASIA
      </text>

      {/* Central glyph */}
      <text x="250" y={glyph.length > 2 ? 275 : 285} textAnchor="middle" fill={inkColor}
            style={{
              fontFamily: 'var(--font-display, "Space Grotesk", sans-serif)',
              fontSize: glyph.length > 2 ? 88 : glyph.length === 2 ? 128 : 160,
              fontWeight: 800, letterSpacing: '-0.04em',
            }}>
        {glyph}
      </text>

      {/* Accent dot flourish */}
      <circle cx="250" cy="315" r="2.4" fill={accent} />

      {/* Badge name — small caps below glyph */}
      <text x="250" y="345" textAnchor="middle" fill={inkColor}
            style={{
              fontFamily: 'var(--font-display, "Space Grotesk", sans-serif)',
              fontSize: 15, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase',
            }}>
        {name}
      </text>

      {/* Subtitle — micro */}
      <text x="250" y="365" textAnchor="middle" fill={inkColor} opacity="0.55"
            style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 8.5, letterSpacing: '0.22em', fontWeight: 500 }}>
        {subtitle.toUpperCase()}
      </text>

      {/* Inner rim highlight */}
      <circle cx="250" cy="250" r={R_FIELD} fill="none"
              stroke="rgba(255,255,255,0.08)" strokeWidth="0.8" />
      <circle cx="250" cy="250" r={R_OUTER - 1} fill="none"
              stroke="rgba(0,0,0,0.35)" strokeWidth="1" />
    </svg>
  );
}

Object.assign(window, { BadgeMedallion, METAL_RAMPS, MONOGRAMS });
