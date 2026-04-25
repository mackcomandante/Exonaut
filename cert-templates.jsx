// cert-templates.jsx — Visual certificate & badge templates
// Each template is a self-contained SVG-based component.

// ─────────────────────────────────────────────
// TIER CERTIFICATION TEMPLATE
// ─────────────────────────────────────────────
function TierCertificate({ tierKey, tierData, earned, name, cohort, cohortName, issueDate }) {
  const color    = tierData.color;
  const bg       = '#0E0D1B';
  const tierNum  = ['entry','builder','prime','elite','apex'].indexOf(tierKey) + 1;
  const certCode = `EXO-TIER-${tierData.short}-${(cohort || COHORT.code).replace(/[^A-Z0-9]/gi,'').toUpperCase()}`;
  const displayName = name || ME.name || 'Exonaut';
  const displayDate = issueDate || (earned ? new Date().toLocaleDateString('en-US',{ month:'short', day:'numeric', year:'numeric' }).toUpperCase() : null);
  const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=https%3A%2F%2Fexoasia.hub%2Fcerts%2F${encodeURIComponent(certCode)}&title=${encodeURIComponent(`I earned the ${tierData.label} tier on the Exoasia Exonaut Program!`)}`;

  return (
    <div style={{ width: '100%' }}>
      {/* Certificate SVG */}
      <svg viewBox="0 0 720 440" xmlns="http://www.w3.org/2000/svg"
        style={{ width:'100%', display:'block', borderRadius:8,
                 filter: earned ? 'none' : 'grayscale(0.85)', opacity: earned ? 1 : 0.55 }}>

        {/* ── Background ── */}
        <defs>
          <radialGradient id={`bg-grad-${tierKey}`} cx="28%" cy="40%" r="70%">
            <stop offset="0%"   stopColor={color} stopOpacity="0.10"/>
            <stop offset="100%" stopColor={bg}    stopOpacity="1"/>
          </radialGradient>
          <radialGradient id={`seal-grad-${tierKey}`} cx="50%" cy="35%" r="65%">
            <stop offset="0%"   stopColor={color} stopOpacity="0.5"/>
            <stop offset="100%" stopColor={color} stopOpacity="0.05"/>
          </radialGradient>
          <filter id={`glow-${tierKey}`}>
            <feGaussianBlur stdDeviation="3" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>

        <rect width="720" height="440" fill={bg} rx="8"/>
        <rect width="720" height="440" fill={`url(#bg-grad-${tierKey})`} rx="8"/>

        {/* ── Borders ── */}
        <rect x="10" y="10" width="700" height="420" fill="none" stroke={color} strokeWidth="1.2" strokeOpacity="0.35" rx="5"/>
        <rect x="18" y="18" width="684" height="404" fill="none" stroke={color} strokeWidth="0.4" strokeOpacity="0.18" rx="3"/>

        {/* ── Corner brackets ── */}
        {[
          [10,10,  55,10,  10,55],
          [665,10, 710,10, 710,55],
          [10,385, 10,430, 55,430],
          [665,430,710,430,710,385],
        ].map(([x1,y1,x2,y2,x3,y3], i) => (
          <polyline key={i} points={`${x1},${y1} ${x2},${y2} ${x3},${y3}`}
            fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="square" filter={`url(#glow-${tierKey})`}/>
        ))}

        {/* ── Header row ── */}
        <text x="360" y="50" textAnchor="middle"
          fontFamily="Montserrat, sans-serif" fontSize="9" fontWeight="800"
          fill={color} fillOpacity="0.9" letterSpacing="5">EXOASIA INNOVATION HUB</text>
        <line x1="100" y1="58" x2="284" y2="58" stroke={color} strokeWidth="0.5" strokeOpacity="0.3"/>
        <text x="360" y="66" textAnchor="middle"
          fontFamily="JetBrains Mono, monospace" fontSize="7.5"
          fill={color} fillOpacity="0.45" letterSpacing="2.5">
          {cohortName ? cohortName.toUpperCase() : 'EXONAUT PROGRAM'}  ·  {cohort || COHORT.code}
        </text>
        <line x1="436" y1="58" x2="620" y2="58" stroke={color} strokeWidth="0.5" strokeOpacity="0.3"/>

        {/* ── Left panel: Shield emblem ── */}
        {/* Shield outer */}
        <g transform="translate(62, 110)">
          {/* Outer glow ring */}
          <circle cx="90" cy="110" r="88" fill="none" stroke={color} strokeWidth="0.5" strokeOpacity="0.15"/>
          <circle cx="90" cy="110" r="78" fill="none" stroke={color} strokeWidth="0.5" strokeOpacity="0.1"/>

          {/* Shield path */}
          <path d="M90,8 L165,32 L165,110 Q165,168 90,190 Q15,168 15,110 L15,32 Z"
            fill={`url(#seal-grad-${tierKey})`}/>
          <path d="M90,8 L165,32 L165,110 Q165,168 90,190 Q15,168 15,110 L15,32 Z"
            fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" filter={`url(#glow-${tierKey})`}/>

          {/* Inner shield */}
          <path d="M90,24 L150,44 L150,108 Q150,156 90,174 Q30,156 30,108 L30,44 Z"
            fill="none" stroke={color} strokeWidth="0.5" strokeOpacity="0.35"/>

          {/* Tier short label */}
          <text x="90" y="108" textAnchor="middle"
            fontFamily="Montserrat, sans-serif" fontSize="26" fontWeight="900"
            fill={color} letterSpacing="3" filter={`url(#glow-${tierKey})`}>{tierData.short}</text>

          {/* Tier fraction */}
          <text x="90" y="130" textAnchor="middle"
            fontFamily="JetBrains Mono, monospace" fontSize="8"
            fill={color} fillOpacity="0.55" letterSpacing="2">TIER {tierNum} / 5</text>

          {/* Bottom dot-row ornament */}
          {[0,1,2,3,4].map(i => (
            <circle key={i} cx={65 + i*13} cy="153" r="2"
              fill={color} fillOpacity={i === 2 ? 0.9 : i === 1 || i === 3 ? 0.5 : 0.2}/>
          ))}

          {/* Seal ring bottom text */}
          <text x="90" y="196" textAnchor="middle"
            fontFamily="JetBrains Mono, monospace" fontSize="7"
            fill={color} fillOpacity="0.3" letterSpacing="2">{certCode}</text>
        </g>

        {/* ── Vertical divider ── */}
        <line x1="255" y1="90" x2="255" y2="370"
          stroke={color} strokeWidth="0.5" strokeOpacity="0.2"/>

        {/* ── Right panel: Certificate text ── */}
        {/* "This certifies that" */}
        <text x="298" y="118"
          fontFamily="EB Garamond, serif" fontSize="15" fontStyle="italic"
          fill="rgba(255,255,255,0.38)">This certifies that</text>

        {/* Name */}
        <text x="298" y="170"
          fontFamily="Montserrat, sans-serif" fontSize="34" fontWeight="800"
          fill="rgba(255,255,255,0.95)" letterSpacing="0.5">{displayName}</text>

        {/* Underline */}
        <line x1="298" y1="182" x2="690" y2="182"
          stroke="rgba(255,255,255,0.08)" strokeWidth="1"/>

        {/* "has achieved the rank of" */}
        <text x="298" y="208"
          fontFamily="EB Garamond, serif" fontSize="13" fontStyle="italic"
          fill="rgba(255,255,255,0.35)">has achieved the rank of</text>

        {/* Tier label — split qualifier + rank for multi-word labels */}
        {(() => {
          const parts = tierData.label.toUpperCase().split(' ');
          if (parts.length === 1) {
            // Single word (Entry: "EXONAUT")
            return (
              <>
                <text x="298" y="268"
                  fontFamily="Montserrat, sans-serif" fontSize="42" fontWeight="900"
                  fill={color} letterSpacing="3" filter={`url(#glow-${tierKey})`}>
                  {parts[0]}
                </text>
                <text x="298" y="290"
                  fontFamily="JetBrains Mono, monospace" fontSize="9"
                  fill={color} fillOpacity="0.5" letterSpacing="2.5">
                  {tierData.min != null ? `UNLOCKED AT ${tierData.min} PTS` : 'AWARDED BY MISSION COMMANDER'}
                </text>
              </>
            );
          }
          // Multi-word: "EXONAUT BUILDER" → small qualifier + large rank word
          return (
            <>
              <text x="298" y="242"
                fontFamily="Montserrat, sans-serif" fontSize="13" fontWeight="700"
                fill={color} fillOpacity="0.55" letterSpacing="6">
                {parts[0]}
              </text>
              <text x="298" y="284"
                fontFamily="Montserrat, sans-serif" fontSize="46" fontWeight="900"
                fill={color} letterSpacing="2" filter={`url(#glow-${tierKey})`}>
                {parts.slice(1).join(' ')}
              </text>
              <text x="298" y="302"
                fontFamily="JetBrains Mono, monospace" fontSize="9"
                fill={color} fillOpacity="0.5" letterSpacing="2.5">
                {tierData.min != null ? `UNLOCKED AT ${tierData.min} PTS` : 'AWARDED BY MISSION COMMANDER'}
              </text>
            </>
          );
        })()}

        {/* ── Divider line ── */}
        <line x1="298" y1="320" x2="690" y2="320"
          stroke={color} strokeWidth="0.4" strokeOpacity="0.25"/>

        {/* ── Footer: date + signature ── */}
        {/* Date */}
        <text x="298" y="346"
          fontFamily="JetBrains Mono, monospace" fontSize="8.5"
          fill="rgba(255,255,255,0.25)" letterSpacing="1.5">
          {displayDate ? `ISSUED · ${displayDate}` : 'NOT YET EARNED'}
        </text>
        <text x="298" y="362"
          fontFamily="JetBrains Mono, monospace" fontSize="8"
          fill="rgba(255,255,255,0.18)" letterSpacing="1">{certCode}</text>

        {/* Signature block */}
        <text x="570" y="340" textAnchor="middle"
          fontFamily="Montserrat, sans-serif" fontSize="12" fontWeight="600"
          fill="rgba(255,255,255,0.38)" letterSpacing="0.5">Mack Comandante</text>
        <line x1="510" y1="328" x2="630" y2="328"
          stroke="rgba(255,255,255,0.12)" strokeWidth="1"/>
        <text x="570" y="358" textAnchor="middle"
          fontFamily="JetBrains Mono, monospace" fontSize="7.5"
          fill="rgba(255,255,255,0.2)" letterSpacing="1">MISSION COMMANDER</text>

        {/* ── LOCKED watermark ── */}
        {!earned && (
          <text x="490" y="250" textAnchor="middle"
            fontFamily="Montserrat, sans-serif" fontSize="72" fontWeight="900"
            fill="rgba(255,255,255,0.025)" letterSpacing="12"
            transform="rotate(-18, 490, 250)">LOCKED</text>
        )}

        {/* ── Bottom strip ── */}
        <rect x="10" y="408" width="700" height="22" fill={color} fillOpacity="0.06" rx="0"/>
        <text x="360" y="422" textAnchor="middle"
          fontFamily="JetBrains Mono, monospace" fontSize="7"
          fill={color} fillOpacity="0.3" letterSpacing="3">
          {(cohortName || 'BATCH 2026–2027').toUpperCase()}  ·  EXONAUT PROGRAM  ·  EXOASIA INNOVATION HUB  ·  PHILIPPINES
        </text>
      </svg>

      {/* ── Actions (below cert) ── */}
      {earned && (
        <div style={{ display:'flex', gap:10, marginTop:14 }}>
          <a href={linkedInUrl} target="_blank" rel="noreferrer"
            style={{ display:'inline-flex', alignItems:'center', gap:7, padding:'9px 18px',
                     background:'#0A66C2', borderRadius:4, color:'#fff',
                     fontFamily:'var(--font-mono)', fontSize:11, fontWeight:700,
                     textDecoration:'none', letterSpacing:'0.06em' }}>
            <i className="fa-brands fa-linkedin"/>SHARE ON LINKEDIN
          </a>
          <button
            style={{ padding:'9px 18px', background:'transparent',
                     border:'1px solid var(--off-white-15)', borderRadius:4,
                     color:'var(--off-white-68)', fontFamily:'var(--font-mono)',
                     fontSize:11, cursor:'pointer', letterSpacing:'0.06em' }}>
            <i className="fa-solid fa-download" style={{ marginRight:6 }}/>DOWNLOAD PNG
          </button>
        </div>
      )}
    </div>
  );
}

Object.assign(window, { TierCertificate });
