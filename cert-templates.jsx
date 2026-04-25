// cert-templates.jsx — Visual certificate & badge templates
// Each template is a self-contained SVG-based component.

// ─────────────────────────────────────────────
// TIER CERTIFICATION TEMPLATE
// ─────────────────────────────────────────────
function TierCertificate({ tierKey, tierData, earned, name, cohort, cohortName, issueDate }) {
  const color       = tierData.color;
  const bg          = '#0E0D1B';
  const tierNum     = ['entry','builder','prime','elite','apex'].indexOf(tierKey) + 1;
  const certCode    = `EXO-TIER-${tierData.short}-${(cohort || COHORT.code).replace(/[^A-Z0-9]/gi,'').toUpperCase()}`;
  const displayName = name || (typeof ME !== 'undefined' ? ME.name : null) || 'Exonaut';
  const displayDate = issueDate || (earned ? new Date().toLocaleDateString('en-US',{ month:'short', day:'numeric', year:'numeric' }).toUpperCase() : null);

  // ── LinkedIn share caption ──────────────────────────────────────────────
  const linkedInCaption = [
    `🎖️ Just earned the ${tierData.label} tier at Exoasia Innovation Hub!`,
    '',
    `The Exonaut Program is a 12-week internship with real world experience — no simulations, just actual client work across AI strategy, venture building, L&D, and more.`,
    '',
    `${cohortName || 'Batch 2026–2027'} · Exoasia Innovation Hub · Philippines 🇵🇭`,
    '',
    '#Exonaut #ExoasiaHub #Innovation #Philippines #AITransformation',
  ].join('\n');

  const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=https%3A%2F%2Fexoasia.hub%2Fcerts%2F${encodeURIComponent(certCode)}`;

  // ── State ───────────────────────────────────────────────────────────────
  const [showShareModal, setShowShareModal] = React.useState(false);
  const [copied, setCopied]                 = React.useState(false);
  const [downloading, setDownloading]       = React.useState(false);
  const svgRef = React.useRef(null);

  // ── Copy caption ─────────────────────────────────────────────────────────
  function copyCaption() {
    navigator.clipboard.writeText(linkedInCaption).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }).catch(() => {
      // Fallback for browsers without clipboard API
      const ta = document.createElement('textarea');
      ta.value = linkedInCaption;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    });
  }

  // ── Download PNG ─────────────────────────────────────────────────────────
  // Serialises the SVG → Blob URL → Image → Canvas (2×) → PNG download.
  function downloadPng() {
    const svg = svgRef.current;
    if (!svg || downloading) return;
    setDownloading(true);

    // Clone the SVG so we can embed an explicit width/height (required by some browsers)
    const clone = svg.cloneNode(true);
    clone.setAttribute('width', '720');
    clone.setAttribute('height', '440');
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

    const svgString = new XMLSerializer().serializeToString(clone);
    const blob      = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url       = URL.createObjectURL(blob);
    const img       = new Image();
    const scale     = 2; // retina

    img.onload = () => {
      const canvas  = document.createElement('canvas');
      canvas.width  = 720 * scale;
      canvas.height = 440 * scale;
      const ctx     = canvas.getContext('2d');
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);

      const a    = document.createElement('a');
      a.download = `${certCode}.png`;
      a.href     = canvas.toDataURL('image/png');
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setDownloading(false);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      setDownloading(false);
      alert('PNG export failed — please try again or screenshot the certificate directly.');
    };

    img.src = url;
  }

  return (
    <div style={{ width: '100%' }}>
      {/* Certificate SVG */}
      <svg ref={svgRef} viewBox="0 0 720 440" xmlns="http://www.w3.org/2000/svg"
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
        <g transform="translate(62, 110)">
          <circle cx="90" cy="110" r="88" fill="none" stroke={color} strokeWidth="0.5" strokeOpacity="0.15"/>
          <circle cx="90" cy="110" r="78" fill="none" stroke={color} strokeWidth="0.5" strokeOpacity="0.1"/>

          <path d="M90,8 L165,32 L165,110 Q165,168 90,190 Q15,168 15,110 L15,32 Z"
            fill={`url(#seal-grad-${tierKey})`}/>
          <path d="M90,8 L165,32 L165,110 Q165,168 90,190 Q15,168 15,110 L15,32 Z"
            fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" filter={`url(#glow-${tierKey})`}/>
          <path d="M90,24 L150,44 L150,108 Q150,156 90,174 Q30,156 30,108 L30,44 Z"
            fill="none" stroke={color} strokeWidth="0.5" strokeOpacity="0.35"/>

          <text x="90" y="108" textAnchor="middle"
            fontFamily="Montserrat, sans-serif" fontSize="26" fontWeight="900"
            fill={color} letterSpacing="3" filter={`url(#glow-${tierKey})`}>{tierData.short}</text>
          <text x="90" y="130" textAnchor="middle"
            fontFamily="JetBrains Mono, monospace" fontSize="8"
            fill={color} fillOpacity="0.55" letterSpacing="2">TIER {tierNum} / 5</text>

          {[0,1,2,3,4].map(i => (
            <circle key={i} cx={65 + i*13} cy="153" r="2"
              fill={color} fillOpacity={i === 2 ? 0.9 : i === 1 || i === 3 ? 0.5 : 0.2}/>
          ))}

          <text x="90" y="196" textAnchor="middle"
            fontFamily="JetBrains Mono, monospace" fontSize="7"
            fill={color} fillOpacity="0.3" letterSpacing="2">{certCode}</text>
        </g>

        {/* ── Vertical divider ── */}
        <line x1="255" y1="90" x2="255" y2="370"
          stroke={color} strokeWidth="0.5" strokeOpacity="0.2"/>

        {/* ── Right panel: Certificate text ── */}
        <text x="298" y="118"
          fontFamily="EB Garamond, serif" fontSize="15" fontStyle="italic"
          fill="rgba(255,255,255,0.38)">This certifies that</text>

        <text x="298" y="170"
          fontFamily="Montserrat, sans-serif" fontSize="34" fontWeight="800"
          fill="rgba(255,255,255,0.95)" letterSpacing="0.5">{displayName}</text>
        <line x1="298" y1="182" x2="690" y2="182"
          stroke="rgba(255,255,255,0.08)" strokeWidth="1"/>

        <text x="298" y="208"
          fontFamily="EB Garamond, serif" fontSize="13" fontStyle="italic"
          fill="rgba(255,255,255,0.35)">has achieved the rank of</text>

        {/* Tier label — split qualifier + rank for multi-word labels */}
        {(() => {
          const parts = tierData.label.toUpperCase().split(' ');
          if (parts.length === 1) {
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
          // Scale rank-word font size by character count so it always fits.
          // Right panel runs x=298 → x=690, giving 392 px of room.
          // Montserrat 900 is ~0.70× em wide per glyph on average.
          // At 36px: 7 chars × 25px + 6×1px spacing ≈ 181px  → fits BUILDER
          // At 42px: 5 chars × 29px + 4×1px spacing ≈ 149px  → fits PRIME / ELITE
          // At 46px: 4 chars × 32px + 3×1px spacing ≈ 131px  → fits APEX
          const rankWord = parts.slice(1).join(' ');
          const rankFs   = rankWord.length <= 4 ? 46
                         : rankWord.length <= 5 ? 42
                         : 36;
          return (
            <>
              <text x="298" y="240"
                fontFamily="Montserrat, sans-serif" fontSize="11" fontWeight="700"
                fill={color} fillOpacity="0.5" letterSpacing="7">
                {parts[0]}
              </text>
              <text x="298" y={240 + rankFs + 4}
                fontFamily="Montserrat, sans-serif" fontSize={rankFs} fontWeight="900"
                fill={color} letterSpacing="1" filter={`url(#glow-${tierKey})`}>
                {rankWord}
              </text>
              <text x="298" y={240 + rankFs + 22}
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
        <text x="298" y="346"
          fontFamily="JetBrains Mono, monospace" fontSize="8.5"
          fill="rgba(255,255,255,0.25)" letterSpacing="1.5">
          {displayDate ? `ISSUED · ${displayDate}` : 'NOT YET EARNED'}
        </text>
        <text x="298" y="362"
          fontFamily="JetBrains Mono, monospace" fontSize="8"
          fill="rgba(255,255,255,0.18)" letterSpacing="1">{certCode}</text>

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
          {/* Share on LinkedIn → opens caption modal */}
          <button
            onClick={() => setShowShareModal(true)}
            style={{ display:'inline-flex', alignItems:'center', gap:7, padding:'9px 18px',
                     background:'#0A66C2', borderRadius:4, color:'#fff',
                     fontFamily:'var(--font-mono)', fontSize:11, fontWeight:700,
                     border:'none', cursor:'pointer', letterSpacing:'0.06em' }}>
            <i className="fa-brands fa-linkedin"/>SHARE ON LINKEDIN
          </button>

          {/* Download PNG */}
          <button
            onClick={downloadPng}
            disabled={downloading}
            style={{ display:'inline-flex', alignItems:'center', gap:7,
                     padding:'9px 18px', background:'transparent',
                     border:'1px solid var(--off-white-15)', borderRadius:4,
                     color: downloading ? 'rgba(255,255,255,0.35)' : 'var(--off-white-68)',
                     fontFamily:'var(--font-mono)', fontSize:11,
                     cursor: downloading ? 'default' : 'pointer', letterSpacing:'0.06em' }}>
            <i className={downloading ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-download'}/>
            {downloading ? 'EXPORTING…' : 'DOWNLOAD PNG'}
          </button>
        </div>
      )}

      {/* ── LinkedIn share modal ── */}
      {showShareModal && (
        <div
          onClick={e => { if (e.target === e.currentTarget) setShowShareModal(false); }}
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.72)',
                   display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999 }}>
          <div style={{ background:'#1A1929', border:'1px solid rgba(255,255,255,0.1)',
                        borderRadius:12, padding:28, width:500, maxWidth:'92vw',
                        boxShadow:'0 24px 64px rgba(0,0,0,0.6)' }}>

            {/* Modal header */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <i className="fa-brands fa-linkedin" style={{ color:'#0A66C2', fontSize:18 }}/>
                <span style={{ fontFamily:'var(--font-mono)', fontSize:11,
                               letterSpacing:'0.1em', color:'rgba(255,255,255,0.7)',
                               fontWeight:700 }}>SHARE ON LINKEDIN</span>
              </div>
              <button
                onClick={() => setShowShareModal(false)}
                style={{ background:'none', border:'none', color:'rgba(255,255,255,0.35)',
                         cursor:'pointer', fontSize:20, lineHeight:1, padding:'0 4px' }}>×</button>
            </div>

            {/* Instruction */}
            <p style={{ margin:'0 0 10px', fontFamily:'var(--font-mono)', fontSize:10,
                        color:'rgba(255,255,255,0.4)', lineHeight:1.6 }}>
              Copy the caption below, then paste it into your LinkedIn post after the share dialog opens.
            </p>

            {/* Caption textarea */}
            <textarea
              readOnly
              value={linkedInCaption}
              onClick={e => e.target.select()}
              style={{ width:'100%', minHeight:172, background:'rgba(255,255,255,0.04)',
                       border:'1px solid rgba(255,255,255,0.1)', borderRadius:6,
                       color:'rgba(255,255,255,0.82)', fontFamily:'var(--font-mono)',
                       fontSize:12, lineHeight:1.65, padding:'12px 14px',
                       resize:'none', boxSizing:'border-box', outline:'none' }}
            />

            {/* Action buttons */}
            <div style={{ display:'flex', gap:10, marginTop:14 }}>
              <button
                onClick={copyCaption}
                style={{ flex:1, padding:'11px 0',
                         background: copied ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.07)',
                         border: copied ? '1px solid rgba(34,197,94,0.5)' : '1px solid rgba(255,255,255,0.12)',
                         borderRadius:6, color: copied ? '#22C55E' : 'rgba(255,255,255,0.8)',
                         fontFamily:'var(--font-mono)', fontSize:11, fontWeight:700,
                         cursor:'pointer', letterSpacing:'0.08em',
                         transition:'all 0.2s' }}>
                {copied
                  ? <><i className="fa-solid fa-check" style={{ marginRight:6 }}/>COPIED!</>
                  : <><i className="fa-regular fa-copy" style={{ marginRight:6 }}/>COPY CAPTION</>}
              </button>

              <a
                href={linkedInUrl}
                target="_blank"
                rel="noreferrer"
                onClick={() => setTimeout(() => setShowShareModal(false), 600)}
                style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center',
                         gap:8, padding:'11px 0', background:'#0A66C2', borderRadius:6,
                         color:'#fff', fontFamily:'var(--font-mono)', fontSize:11,
                         fontWeight:700, textDecoration:'none', letterSpacing:'0.08em' }}>
                <i className="fa-brands fa-linkedin"/>OPEN LINKEDIN →
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

Object.assign(window, { TierCertificate });
