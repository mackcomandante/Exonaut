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

        {/* Tier label — always "EXONAUT"; tier identity lives on the shield badge */}
        <text x="298" y="268"
          fontFamily="Montserrat, sans-serif" fontSize="42" fontWeight="900"
          fill={color} letterSpacing="3" filter={`url(#glow-${tierKey})`}>
          EXONAUT
        </text>
        <text x="298" y="290"
          fontFamily="JetBrains Mono, monospace" fontSize="9"
          fill={color} fillOpacity="0.5" letterSpacing="2.5">
          {tierData.min != null ? `UNLOCKED AT ${tierData.min} PTS` : 'AWARDED BY MISSION COMMANDER'}
        </text>

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

// ─────────────────────────────────────────────
// SHARED BADGE HELPERS
// ─────────────────────────────────────────────
const BG = '#0E0D1B';

// Pointy-top regular hexagon points string given center + radius
function hexPoints(cx, cy, r) {
  return [0,1,2,3,4,5].map(i => {
    const a = Math.PI / 3 * i - Math.PI / 2;
    return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
  }).join(' ');
}

// 8-pointed star points string given center, outer radius, inner radius
function starPoints(cx, cy, R, r) {
  return Array.from({ length: 16 }, (_, i) => {
    const a = Math.PI / 8 * i - Math.PI / 2;
    const rad = i % 2 === 0 ? R : r;
    return `${(cx + rad * Math.cos(a)).toFixed(1)},${(cy + rad * Math.sin(a)).toFixed(1)}`;
  }).join(' ');
}

// ─────────────────────────────────────────────
// MILESTONE BADGE  — hexagonal medal
// ─────────────────────────────────────────────
function MilestoneBadge({ badge, earned }) {
  const { code, name, subtitle, color } = badge;
  const id = code.replace(/[^A-Z0-9]/g, '');

  const ROMAN  = { 'MILBRZ':'I',  'MILSLV':'II', 'MILGLD':'III', 'MILPLT':'IV'  };
  const METAL  = { 'MILBRZ':'BRONZE','MILSLV':'SILVER','MILGLD':'GOLD','MILPLT':'PLATINUM' };
  const roman  = ROMAN[id]  || 'I';
  const metal  = METAL[id]  || '';
  const isGold = id === 'MILGLD';
  const isPlt  = id === 'MILPLT';

  // Hex geometry — viewBox 160×195, center (80,82)
  const CX = 80, CY = 82;
  const outerHex  = hexPoints(CX, CY, 62);
  const innerHex  = hexPoints(CX, CY, 52);
  const microHex  = hexPoints(CX, CY, 44);

  return (
    <svg viewBox="0 0 160 195" xmlns="http://www.w3.org/2000/svg"
      style={{ width:'100%', display:'block',
               filter: earned ? 'none' : 'grayscale(0.9)', opacity: earned ? 1 : 0.45 }}>
      <defs>
        <radialGradient id={`mg-${id}`} cx="50%" cy="40%" r="65%">
          <stop offset="0%" stopColor={color} stopOpacity="0.22"/>
          <stop offset="100%" stopColor={BG}  stopOpacity="1"/>
        </radialGradient>
        <filter id={`gw-${id}`}>
          <feGaussianBlur stdDeviation="3" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      {/* Background fill */}
      <polygon points={outerHex} fill={BG}/>
      <polygon points={outerHex} fill={`url(#mg-${id})`}/>

      {/* Gold: sunrays */}
      {isGold && [0,1,2,3,4,5,6,7,8,9,10,11].map(i => {
        const a = Math.PI / 6 * i;
        return <line key={i}
          x1={CX} y1={CY}
          x2={(CX + 70 * Math.cos(a)).toFixed(1)}
          y2={(CY + 70 * Math.sin(a)).toFixed(1)}
          stroke={color} strokeWidth="0.6" strokeOpacity="0.12"/>;
      })}

      {/* Platinum: extra outer glow ring */}
      {isPlt && <polygon points={hexPoints(CX,CY,68)}
        fill="none" stroke={color} strokeWidth="0.8" strokeOpacity="0.2" strokeDasharray="4 3"/>}

      {/* Outer hex border */}
      <polygon points={outerHex}
        fill="none" stroke={color} strokeWidth="1.8" strokeOpacity="0.7"
        filter={earned ? `url(#gw-${id})` : undefined}/>
      {/* Inner hex ring */}
      <polygon points={innerHex}
        fill="none" stroke={color} strokeWidth="0.7" strokeOpacity="0.3"/>
      {/* Silver / Platinum: micro ring */}
      {(id === 'MILSLV' || isPlt) && (
        <polygon points={microHex}
          fill="none" stroke={color} strokeWidth="0.4" strokeOpacity="0.2"/>
      )}

      {/* Roman numeral */}
      <text x={CX} y={CY + 12} textAnchor="middle"
        fontFamily="Montserrat, sans-serif" fontSize="38" fontWeight="900"
        fill={color} filter={earned ? `url(#gw-${id})` : undefined}>
        {roman}
      </text>

      {/* Metal label */}
      <text x={CX} y={CY + 30} textAnchor="middle"
        fontFamily="JetBrains Mono, monospace" fontSize="6.5" fontWeight="700"
        fill={color} fillOpacity="0.55" letterSpacing="3">
        {metal}
      </text>

      {/* Dot row ornament */}
      {[-14, 0, 14].map((dx, i) => (
        <circle key={i} cx={CX + dx} cy={CY + 44} r="2"
          fill={color} fillOpacity={i === 1 ? 0.9 : 0.3}/>
      ))}

      {/* Name */}
      <text x={CX} y="158" textAnchor="middle"
        fontFamily="Montserrat, sans-serif" fontSize="10.5" fontWeight="800"
        fill="rgba(255,255,255,0.88)">
        {name}
      </text>
      {/* Subtitle */}
      <text x={CX} y="173" textAnchor="middle"
        fontFamily="JetBrains Mono, monospace" fontSize="7.5"
        fill="rgba(255,255,255,0.32)" letterSpacing="1">
        {subtitle.toUpperCase()}
      </text>
    </svg>
  );
}

// ─────────────────────────────────────────────
// TRACK BADGE  — circular credential
// ─────────────────────────────────────────────
function TrackBadge({ badge, earned }) {
  const { code, name, subtitle, color } = badge;
  const id = code.replace(/[^A-Z0-9]/g, '');

  const SYMBOL = {
    'TRKAIS':'AIS', 'TRKVB':'VB', 'TRKLD':'L&D',
    'TRKXM':'XM',  'TRKAID':'DEV','TRKPOL':'POL', 'TRKCC':'SMM',
  };
  const sym    = SYMBOL[id] || code.replace('TRK-','');
  const symFs  = sym.length <= 2 ? 30 : sym.length <= 3 ? 24 : 18;

  const CX = 80, CY = 80, R = 62;

  // 12 tick marks around the rim
  const ticks = Array.from({ length: 12 }, (_, i) => {
    const a    = Math.PI / 6 * i - Math.PI / 2;
    const r1   = R - 2, r2 = R + 5;
    const long = i % 3 === 0;
    return {
      x1: (CX + (long ? r1 - 4 : r1) * Math.cos(a)).toFixed(1),
      y1: (CY + (long ? r1 - 4 : r1) * Math.sin(a)).toFixed(1),
      x2: (CX + r2 * Math.cos(a)).toFixed(1),
      y2: (CY + r2 * Math.sin(a)).toFixed(1),
      long,
    };
  });

  return (
    <svg viewBox="0 0 160 195" xmlns="http://www.w3.org/2000/svg"
      style={{ width:'100%', display:'block',
               filter: earned ? 'none' : 'grayscale(0.9)', opacity: earned ? 1 : 0.45 }}>
      <defs>
        <radialGradient id={`tg-${id}`} cx="50%" cy="40%" r="65%">
          <stop offset="0%" stopColor={color} stopOpacity="0.2"/>
          <stop offset="100%" stopColor={BG}  stopOpacity="1"/>
        </radialGradient>
        <filter id={`tw-${id}`}>
          <feGaussianBlur stdDeviation="3" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <clipPath id={`tc-${id}`}>
          <circle cx={CX} cy={CY} r={R}/>
        </clipPath>
      </defs>

      {/* Background */}
      <circle cx={CX} cy={CY} r={R} fill={BG}/>
      <circle cx={CX} cy={CY} r={R} fill={`url(#tg-${id})`}/>

      {/* Concentric guide rings */}
      <circle cx={CX} cy={CY} r={R - 10} fill="none" stroke={color} strokeWidth="0.5" strokeOpacity="0.15"/>
      <circle cx={CX} cy={CY} r={R - 20} fill="none" stroke={color} strokeWidth="0.4" strokeOpacity="0.1"/>

      {/* Outer ring */}
      <circle cx={CX} cy={CY} r={R}
        fill="none" stroke={color} strokeWidth="2" strokeOpacity="0.7"
        filter={earned ? `url(#tw-${id})` : undefined}/>

      {/* Tick marks */}
      {ticks.map((t, i) => (
        <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
          stroke={color} strokeWidth={t.long ? 1.4 : 0.7}
          strokeOpacity={t.long ? 0.7 : 0.3}/>
      ))}

      {/* Track symbol */}
      <text x={CX} y={CY + symFs * 0.36} textAnchor="middle"
        fontFamily="Montserrat, sans-serif" fontSize={symFs} fontWeight="900"
        fill={color} letterSpacing="1"
        filter={earned ? `url(#tw-${id})` : undefined}>
        {sym}
      </text>

      {/* TRACK label */}
      <text x={CX} y={CY + symFs * 0.36 + 14} textAnchor="middle"
        fontFamily="JetBrains Mono, monospace" fontSize="6" fontWeight="700"
        fill={color} fillOpacity="0.45" letterSpacing="3">
        TRACK
      </text>

      {/* Name */}
      <text x={CX} y="158" textAnchor="middle"
        fontFamily="Montserrat, sans-serif" fontSize="10.5" fontWeight="800"
        fill="rgba(255,255,255,0.88)">
        {name}
      </text>
      <text x={CX} y="173" textAnchor="middle"
        fontFamily="JetBrains Mono, monospace" fontSize="7.5"
        fill="rgba(255,255,255,0.32)" letterSpacing="1">
        {subtitle.toUpperCase()}
      </text>
    </svg>
  );
}

// ─────────────────────────────────────────────
// PILLAR BADGE  — diamond shape
// ─────────────────────────────────────────────
function PillarBadge({ badge, earned }) {
  const { code, name, subtitle, color } = badge;
  const id = code.replace(/[^A-Z0-9]/g, '');

  const SYMBOL = {
    'PILCLV':'DLV','PILDLV':'DLV','PILINN':'INN','PILCLT':'CLT','PILTAL':'TAL',
  };
  // Column-bar heights for decorative "pillar" graphic inside diamond
  const BARS = {
    'PILDLV': [42, 60, 42],  // Delivery — tall center
    'PILINN': [36, 36, 60],  // Innovation — rising right
    'PILCLT': [54, 54, 54],  // Client — equal
    'PILTAL': [60, 42, 30],  // Talent — descending
  };
  const bars  = BARS[id] || [44, 60, 44];
  const sym   = SYMBOL[id] || code.replace('PIL-','');

  const CX = 80, CY = 82;
  // Diamond: top, right, bottom, left
  const outerDiamond = `${CX},${CY-64} ${CX+58},${CY} ${CX},${CY+64} ${CX-58},${CY}`;
  const innerDiamond = `${CX},${CY-54} ${CX+48},${CY} ${CX},${CY+54} ${CX-48},${CY}`;

  return (
    <svg viewBox="0 0 160 195" xmlns="http://www.w3.org/2000/svg"
      style={{ width:'100%', display:'block',
               filter: earned ? 'none' : 'grayscale(0.9)', opacity: earned ? 1 : 0.45 }}>
      <defs>
        <radialGradient id={`pg-${id}`} cx="50%" cy="40%" r="65%">
          <stop offset="0%" stopColor={color} stopOpacity="0.2"/>
          <stop offset="100%" stopColor={BG}  stopOpacity="1"/>
        </radialGradient>
        <filter id={`pw-${id}`}>
          <feGaussianBlur stdDeviation="2.5" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <clipPath id={`pc-${id}`}>
          <polygon points={outerDiamond}/>
        </clipPath>
      </defs>

      {/* Background */}
      <polygon points={outerDiamond} fill={BG}/>
      <polygon points={outerDiamond} fill={`url(#pg-${id})`}/>

      {/* Cross-hair guides */}
      <line x1={CX} y1={CY - 64} x2={CX} y2={CY + 64}
        stroke={color} strokeWidth="0.4" strokeOpacity="0.1"/>
      <line x1={CX - 58} y1={CY} x2={CX + 58} y2={CY}
        stroke={color} strokeWidth="0.4" strokeOpacity="0.1"/>

      {/* Pillar bars (decorative column graphic) */}
      {bars.map((h, i) => {
        const bw = 9, gap = 6;
        const totalW = bars.length * bw + (bars.length - 1) * gap;
        const x = CX - totalW / 2 + i * (bw + gap);
        const y = CY + 24 - h;
        return (
          <rect key={i} x={x} y={y} width={bw} height={h} rx="1.5"
            fill={color} fillOpacity={i === 1 ? 0.35 : 0.2}
            clipPath={`url(#pc-${id})`}/>
        );
      })}

      {/* Outer diamond border */}
      <polygon points={outerDiamond}
        fill="none" stroke={color} strokeWidth="1.8" strokeOpacity="0.7"
        filter={earned ? `url(#pw-${id})` : undefined}/>
      {/* Inner diamond ring */}
      <polygon points={innerDiamond}
        fill="none" stroke={color} strokeWidth="0.6" strokeOpacity="0.25"/>

      {/* Badge code */}
      <text x={CX} y={CY - 8} textAnchor="middle"
        fontFamily="Montserrat, sans-serif" fontSize="22" fontWeight="900"
        fill={color} letterSpacing="2"
        filter={earned ? `url(#pw-${id})` : undefined}>
        {sym}
      </text>
      <text x={CX} y={CY + 8} textAnchor="middle"
        fontFamily="JetBrains Mono, monospace" fontSize="6" fontWeight="700"
        fill={color} fillOpacity="0.45" letterSpacing="3">
        PILLAR
      </text>

      {/* Name */}
      <text x={CX} y="162" textAnchor="middle"
        fontFamily="Montserrat, sans-serif" fontSize="10.5" fontWeight="800"
        fill="rgba(255,255,255,0.88)">
        {name}
      </text>
      <text x={CX} y="177" textAnchor="middle"
        fontFamily="JetBrains Mono, monospace" fontSize="7.5"
        fill="rgba(255,255,255,0.32)" letterSpacing="1">
        {subtitle.toUpperCase()}
      </text>
    </svg>
  );
}

// ─────────────────────────────────────────────
// SPECIAL AWARD BADGE  — 8-point starburst
// ─────────────────────────────────────────────
function SpecialBadge({ badge, earned }) {
  const { code, name, subtitle, color } = badge;
  const id = code.replace(/[^A-Z0-9]/g, '');

  const SYMBOL = {
    'SPLTRI':'TRI','SPLMVP':'MVP','SPLIOW':'IOW',
    'SPLDIS':'DIS','SPLCLT':'CLT','SPLFVL':'FCL',
    'SPLFUL':'FCL','SPLPIP':'PIP',
  };
  const sym   = SYMBOL[id] || code.replace('SPL-','');
  const symFs = sym.length <= 2 ? 28 : sym.length <= 3 ? 22 : 16;

  const CX = 80, CY = 80;
  const star  = starPoints(CX, CY, 62, 28);
  const star2 = starPoints(CX, CY, 54, 24); // inner echo

  return (
    <svg viewBox="0 0 160 195" xmlns="http://www.w3.org/2000/svg"
      style={{ width:'100%', display:'block',
               filter: earned ? 'none' : 'grayscale(0.9)', opacity: earned ? 1 : 0.45 }}>
      <defs>
        <radialGradient id={`sg-${id}`} cx="50%" cy="40%" r="65%">
          <stop offset="0%" stopColor={color} stopOpacity="0.22"/>
          <stop offset="100%" stopColor={BG}  stopOpacity="1"/>
        </radialGradient>
        <filter id={`sw-${id}`}>
          <feGaussianBlur stdDeviation="3" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <clipPath id={`sc-${id}`}>
          <polygon points={star}/>
        </clipPath>
      </defs>

      {/* Background */}
      <polygon points={star} fill={BG}/>
      <polygon points={star} fill={`url(#sg-${id})`}/>

      {/* Inner echo star */}
      <polygon points={star2}
        fill="none" stroke={color} strokeWidth="0.5" strokeOpacity="0.2"/>

      {/* Outer starburst */}
      <polygon points={star}
        fill="none" stroke={color} strokeWidth="1.8" strokeOpacity="0.7"
        filter={earned ? `url(#sw-${id})` : undefined}/>

      {/* Central circle */}
      <circle cx={CX} cy={CY} r="26"
        fill="none" stroke={color} strokeWidth="0.6" strokeOpacity="0.25"/>

      {/* Award symbol */}
      <text x={CX} y={CY + symFs * 0.36} textAnchor="middle"
        fontFamily="Montserrat, sans-serif" fontSize={symFs} fontWeight="900"
        fill={color} letterSpacing="1.5"
        filter={earned ? `url(#sw-${id})` : undefined}>
        {sym}
      </text>

      {/* AWARD label */}
      <text x={CX} y={CY + symFs * 0.36 + 14} textAnchor="middle"
        fontFamily="JetBrains Mono, monospace" fontSize="6" fontWeight="700"
        fill={color} fillOpacity="0.45" letterSpacing="3">
        AWARD
      </text>

      {/* Name */}
      <text x={CX} y="158" textAnchor="middle"
        fontFamily="Montserrat, sans-serif" fontSize="10.5" fontWeight="800"
        fill="rgba(255,255,255,0.88)">
        {name}
      </text>
      <text x={CX} y="173" textAnchor="middle"
        fontFamily="JetBrains Mono, monospace" fontSize="7.5"
        fill="rgba(255,255,255,0.32)" letterSpacing="1">
        {subtitle.toUpperCase()}
      </text>
    </svg>
  );
}

// ─────────────────────────────────────────────
// BADGE FULL-PAGE CERTIFICATE  (720 × 440 SVG)
// ─────────────────────────────────────────────
function BadgeCertificate({ badge, name, cohortName, issueDate }) {
  const { code, color, category, subtitle } = badge;
  const badgeName   = badge.name;
  const id          = code.replace(/[^A-Z0-9]/g, '');
  const certCode    = `EXO-BADGE-${id}`;
  const displayName = name || (typeof ME !== 'undefined' ? ME?.name : null) || 'Exonaut';
  const displayDate = issueDate || new Date().toLocaleDateString('en-US',{ month:'short', day:'numeric', year:'numeric' }).toUpperCase();
  const CX = 152, CY = 220; // left-panel center

  // ── Badge shape inside the cert left panel ─────────────────────
  function ShapeLeft() {
    const R = 90, r = 40;
    if (category === 'milestone') {
      const outer = hexPoints(CX, CY, R);
      const inner = hexPoints(CX, CY, R - 14);
      return <>
        <polygon points={outer} fill={`url(#bc-bg-${id})`}/>
        <polygon points={outer} fill="none" stroke={color} strokeWidth="2" strokeOpacity="0.8" filter={`url(#bc-glow-${id})`}/>
        <polygon points={inner} fill="none" stroke={color} strokeWidth="0.7" strokeOpacity="0.3"/>
      </>;
    }
    if (category === 'track') {
      const ticks = Array.from({ length: 12 }, (_, i) => {
        const a = Math.PI / 6 * i - Math.PI / 2;
        return { x1:(CX+(R-4)*Math.cos(a)).toFixed(1), y1:(CY+(R-4)*Math.sin(a)).toFixed(1),
                 x2:(CX+(R+5)*Math.cos(a)).toFixed(1), y2:(CY+(R+5)*Math.sin(a)).toFixed(1), long: i%3===0 };
      });
      return <>
        <circle cx={CX} cy={CY} r={R} fill={`url(#bc-bg-${id})`}/>
        <circle cx={CX} cy={CY} r={R} fill="none" stroke={color} strokeWidth="2.2" strokeOpacity="0.8" filter={`url(#bc-glow-${id})`}/>
        <circle cx={CX} cy={CY} r={R-14} fill="none" stroke={color} strokeWidth="0.6" strokeOpacity="0.2"/>
        {ticks.map((t,i) => <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke={color} strokeWidth={t.long?1.6:0.8} strokeOpacity={t.long?0.7:0.3}/>)}
      </>;
    }
    if (category === 'pillar') {
      const od = `${CX},${CY-R} ${CX+R*0.86},${CY} ${CX},${CY+R} ${CX-R*0.86},${CY}`;
      const id2 = `${CX},${CY-R+14} ${CX+(R-14)*0.86},${CY} ${CX},${CY+R-14} ${CX-(R-14)*0.86},${CY}`;
      return <>
        <polygon points={od} fill={`url(#bc-bg-${id})`}/>
        <polygon points={od} fill="none" stroke={color} strokeWidth="2" strokeOpacity="0.8" filter={`url(#bc-glow-${id})`}/>
        <polygon points={id2} fill="none" stroke={color} strokeWidth="0.6" strokeOpacity="0.25"/>
      </>;
    }
    // special — starburst
    const star  = starPoints(CX, CY, R, r);
    const star2 = starPoints(CX, CY, R-12, r-4);
    return <>
      <polygon points={star} fill={`url(#bc-bg-${id})`}/>
      <polygon points={star} fill="none" stroke={color} strokeWidth="2" strokeOpacity="0.8" filter={`url(#bc-glow-${id})`}/>
      <polygon points={star2} fill="none" stroke={color} strokeWidth="0.5" strokeOpacity="0.2"/>
    </>;
  }

  // ── Central label inside shape ─────────────────────────────────
  function ShapeLabel() {
    const ROMAN = {'MILBRZ':'I','MILSLV':'II','MILGLD':'III','MILPLT':'IV'};
    const TRACK_SYM = {'TRKAIS':'AIS','TRKVB':'VB','TRKLD':'L&D','TRKXM':'XM','TRKAID':'DEV','TRKPOL':'POL','TRKCC':'SMM'};
    const PILLAR_SYM = {'PILDLV':'DLV','PILINN':'INN','PILCLT':'CLT','PILTAL':'TAL'};
    const SPL_SYM = {'SPLTRI':'TRI','SPLMVP':'MVP','SPLIOW':'IOW','SPLDIS':'DIS','SPLCLT':'CLT','SPLFUL':'FCL','SPLPIP':'PIP'};
    let sym = ROMAN[id] || TRACK_SYM[id] || PILLAR_SYM[id] || SPL_SYM[id] || id.slice(-3);
    const fs = sym.length <= 2 ? 44 : sym.length <= 3 ? 36 : 28;
    return <>
      <text x={CX} y={CY + fs*0.38} textAnchor="middle"
        fontFamily="Montserrat, sans-serif" fontSize={fs} fontWeight="900"
        fill={color} letterSpacing="2" filter={`url(#bc-glow-${id})`}>{sym}</text>
      <text x={CX} y={CY + fs*0.38 + 18} textAnchor="middle"
        fontFamily="JetBrains Mono, monospace" fontSize="7" fontWeight="700"
        fill={color} fillOpacity="0.5" letterSpacing="3">{category.toUpperCase()}</text>
    </>;
  }

  const [showShareModal, setShowShareModal] = React.useState(false);
  const [copied, setCopied]                 = React.useState(false);
  const [downloading, setDownloading]       = React.useState(false);
  const svgRef = React.useRef(null);

  const linkedInCaption = [
    `🏅 Just earned the "${badgeName}" badge at Exoasia Innovation Hub!`,
    '',
    `The Exonaut Program is a 12-week internship with real world experience — no simulations, just actual client work across AI strategy, venture building, L&D, and more.`,
    '',
    `${cohortName || 'Batch 2026–2027'} · Exoasia Innovation Hub · Philippines 🇵🇭`,
    '',
    '#Exonaut #ExoasiaHub #Innovation #Philippines #AITransformation',
  ].join('\n');
  const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=https%3A%2F%2Fexoasia.hub%2Fbadges%2F${encodeURIComponent(certCode)}`;

  function copyCaption() {
    navigator.clipboard.writeText(linkedInCaption).catch(() => {});
    setCopied(true); setTimeout(() => setCopied(false), 2200);
  }
  function downloadPng() {
    const svg = svgRef.current; if (!svg || downloading) return;
    setDownloading(true);
    const clone = svg.cloneNode(true);
    clone.setAttribute('width','720'); clone.setAttribute('height','440');
    const blob = new Blob([new XMLSerializer().serializeToString(clone)], { type:'image/svg+xml;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const img  = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas'); canvas.width=1440; canvas.height=880;
      const ctx = canvas.getContext('2d'); ctx.scale(2,2); ctx.drawImage(img,0,0);
      URL.revokeObjectURL(url);
      const a = document.createElement('a'); a.download=`${certCode}.png`; a.href=canvas.toDataURL('image/png');
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setDownloading(false);
    };
    img.onerror = () => { URL.revokeObjectURL(url); setDownloading(false); };
    img.src = url;
  }

  return (
    <div style={{ width:'100%' }}>
      <svg ref={svgRef} viewBox="0 0 720 440" xmlns="http://www.w3.org/2000/svg"
        style={{ width:'100%', display:'block', borderRadius:8 }}>
        <defs>
          <radialGradient id={`bc-bg-${id}`} cx="50%" cy="40%" r="65%">
            <stop offset="0%" stopColor={color} stopOpacity="0.18"/>
            <stop offset="100%" stopColor={BG}  stopOpacity="1"/>
          </radialGradient>
          <radialGradient id={`bc-full-${id}`} cx="22%" cy="50%" r="70%">
            <stop offset="0%" stopColor={color} stopOpacity="0.10"/>
            <stop offset="100%" stopColor={BG}  stopOpacity="1"/>
          </radialGradient>
          <filter id={`bc-glow-${id}`}>
            <feGaussianBlur stdDeviation="3" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>

        {/* Background */}
        <rect width="720" height="440" fill={BG} rx="8"/>
        <rect width="720" height="440" fill={`url(#bc-full-${id})`} rx="8"/>

        {/* Borders */}
        <rect x="10" y="10" width="700" height="420" fill="none" stroke={color} strokeWidth="1.2" strokeOpacity="0.35" rx="5"/>
        <rect x="18" y="18" width="684" height="404" fill="none" stroke={color} strokeWidth="0.4" strokeOpacity="0.18" rx="3"/>

        {/* Corner brackets */}
        {[[10,10,55,10,10,55],[665,10,710,10,710,55],[10,385,10,430,55,430],[665,430,710,430,710,385]].map(([x1,y1,x2,y2,x3,y3],i) => (
          <polyline key={i} points={`${x1},${y1} ${x2},${y2} ${x3},${y3}`}
            fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="square" filter={`url(#bc-glow-${id})`}/>
        ))}

        {/* Header */}
        <text x="360" y="50" textAnchor="middle" fontFamily="Montserrat, sans-serif" fontSize="9" fontWeight="800"
          fill={color} fillOpacity="0.9" letterSpacing="5">EXOASIA INNOVATION HUB</text>
        <line x1="100" y1="58" x2="280" y2="58" stroke={color} strokeWidth="0.5" strokeOpacity="0.3"/>
        <text x="360" y="66" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="7.5"
          fill={color} fillOpacity="0.45" letterSpacing="2.5">
          {cohortName ? cohortName.toUpperCase() : 'EXONAUT PROGRAM'}  ·  BADGE OF ACHIEVEMENT
        </text>
        <line x1="440" y1="58" x2="620" y2="58" stroke={color} strokeWidth="0.5" strokeOpacity="0.3"/>

        {/* Left panel: badge shape */}
        <ShapeLeft/>
        <ShapeLabel/>

        {/* Vertical divider */}
        <line x1="255" y1="90" x2="255" y2="370" stroke={color} strokeWidth="0.5" strokeOpacity="0.2"/>

        {/* Right panel */}
        <text x="298" y="118" fontFamily="EB Garamond, serif" fontSize="15" fontStyle="italic"
          fill="rgba(255,255,255,0.38)">This certifies that</text>
        <text x="298" y="170" fontFamily="Montserrat, sans-serif" fontSize="34" fontWeight="800"
          fill="rgba(255,255,255,0.95)" letterSpacing="0.5">{displayName}</text>
        <line x1="298" y1="182" x2="690" y2="182" stroke="rgba(255,255,255,0.08)" strokeWidth="1"/>
        <text x="298" y="208" fontFamily="EB Garamond, serif" fontSize="13" fontStyle="italic"
          fill="rgba(255,255,255,0.35)">has been awarded the</text>

        {/* Badge name — scale font to fit */}
        <text x="298" y="258" fontFamily="Montserrat, sans-serif"
          fontSize={badgeName.length <= 14 ? 34 : badgeName.length <= 20 ? 26 : 20}
          fontWeight="900" fill={color} letterSpacing="1" filter={`url(#bc-glow-${id})`}>
          {badgeName.toUpperCase()}
        </text>
        <text x="298" y="278" fontFamily="JetBrains Mono, monospace" fontSize="9"
          fill={color} fillOpacity="0.5" letterSpacing="2.5">{subtitle.toUpperCase()}</text>

        <line x1="298" y1="310" x2="690" y2="310" stroke={color} strokeWidth="0.4" strokeOpacity="0.25"/>

        {/* Footer */}
        <text x="298" y="336" fontFamily="JetBrains Mono, monospace" fontSize="8.5"
          fill="rgba(255,255,255,0.25)" letterSpacing="1.5">ISSUED · {displayDate}</text>
        <text x="298" y="352" fontFamily="JetBrains Mono, monospace" fontSize="8"
          fill="rgba(255,255,255,0.18)" letterSpacing="1">{certCode}</text>

        {/* Signature */}
        <text x="570" y="330" textAnchor="middle" fontFamily="Montserrat, sans-serif" fontSize="12" fontWeight="600"
          fill="rgba(255,255,255,0.38)" letterSpacing="0.5">Mack Comandante</text>
        <line x1="510" y1="318" x2="630" y2="318" stroke="rgba(255,255,255,0.12)" strokeWidth="1"/>
        <text x="570" y="348" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="7.5"
          fill="rgba(255,255,255,0.2)" letterSpacing="1">MISSION COMMANDER</text>

        {/* Bottom strip */}
        <rect x="10" y="408" width="700" height="22" fill={color} fillOpacity="0.06"/>
        <text x="360" y="422" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="7"
          fill={color} fillOpacity="0.3" letterSpacing="3">
          {(cohortName || 'BATCH 2026–2027').toUpperCase()}  ·  EXONAUT PROGRAM  ·  EXOASIA INNOVATION HUB  ·  PHILIPPINES
        </text>
      </svg>

      {/* Actions */}
      <div style={{ display:'flex', gap:10, marginTop:14 }}>
        <button onClick={() => setShowShareModal(true)}
          style={{ display:'inline-flex', alignItems:'center', gap:7, padding:'9px 18px',
                   background:'#0A66C2', borderRadius:4, color:'#fff', fontFamily:'var(--font-mono)',
                   fontSize:11, fontWeight:700, border:'none', cursor:'pointer', letterSpacing:'0.06em' }}>
          <i className="fa-brands fa-linkedin"/>SHARE ON LINKEDIN
        </button>
        <button onClick={downloadPng} disabled={downloading}
          style={{ display:'inline-flex', alignItems:'center', gap:7, padding:'9px 18px',
                   background:'transparent', border:'1px solid var(--off-white-15)', borderRadius:4,
                   color: downloading ? 'rgba(255,255,255,0.35)' : 'var(--off-white-68)',
                   fontFamily:'var(--font-mono)', fontSize:11,
                   cursor: downloading ? 'default' : 'pointer', letterSpacing:'0.06em' }}>
          <i className={downloading ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-download'}/>
          {downloading ? 'EXPORTING…' : 'DOWNLOAD PNG'}
        </button>
      </div>

      {/* Share modal */}
      {showShareModal && (
        <div onClick={e => { if (e.target===e.currentTarget) setShowShareModal(false); }}
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.72)',
                   display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999 }}>
          <div style={{ background:'#1A1929', border:'1px solid rgba(255,255,255,0.1)',
                        borderRadius:12, padding:28, width:500, maxWidth:'92vw' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
              <span style={{ fontFamily:'var(--font-mono)', fontSize:11, letterSpacing:'0.1em',
                             color:'rgba(255,255,255,0.7)', fontWeight:700 }}>SHARE ON LINKEDIN</span>
              <button onClick={() => setShowShareModal(false)}
                style={{ background:'none', border:'none', color:'rgba(255,255,255,0.35)',
                         cursor:'pointer', fontSize:20 }}>×</button>
            </div>
            <p style={{ margin:'0 0 10px', fontFamily:'var(--font-mono)', fontSize:10,
                        color:'rgba(255,255,255,0.4)', lineHeight:1.6 }}>
              Copy the caption, then paste it into your LinkedIn post after the share dialog opens.
            </p>
            <textarea readOnly value={linkedInCaption} onClick={e => e.target.select()}
              style={{ width:'100%', minHeight:172, background:'rgba(255,255,255,0.04)',
                       border:'1px solid rgba(255,255,255,0.1)', borderRadius:6,
                       color:'rgba(255,255,255,0.82)', fontFamily:'var(--font-mono)',
                       fontSize:12, lineHeight:1.65, padding:'12px 14px', resize:'none',
                       boxSizing:'border-box', outline:'none' }}/>
            <div style={{ display:'flex', gap:10, marginTop:14 }}>
              <button onClick={copyCaption}
                style={{ flex:1, padding:'11px 0',
                         background: copied ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.07)',
                         border: copied ? '1px solid rgba(34,197,94,0.5)' : '1px solid rgba(255,255,255,0.12)',
                         borderRadius:6, color: copied ? '#22C55E' : 'rgba(255,255,255,0.8)',
                         fontFamily:'var(--font-mono)', fontSize:11, fontWeight:700,
                         cursor:'pointer', letterSpacing:'0.08em' }}>
                {copied ? <><i className="fa-solid fa-check" style={{ marginRight:6 }}/>COPIED!</> : <><i className="fa-regular fa-copy" style={{ marginRight:6 }}/>COPY CAPTION</>}
              </button>
              <a href={linkedInUrl} target="_blank" rel="noreferrer"
                onClick={() => setTimeout(() => setShowShareModal(false), 600)}
                style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                         padding:'11px 0', background:'#0A66C2', borderRadius:6, color:'#fff',
                         fontFamily:'var(--font-mono)', fontSize:11, fontWeight:700,
                         textDecoration:'none', letterSpacing:'0.08em' }}>
                <i className="fa-brands fa-linkedin"/>OPEN LINKEDIN →
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// BADGE SVG DISPATCHER
// ─────────────────────────────────────────────
function BadgeSVG({ badge, earned }) {
  if (!badge) return null;
  const cat = badge.category;
  if (cat === 'milestone') return <MilestoneBadge badge={badge} earned={earned}/>;
  if (cat === 'track')     return <TrackBadge     badge={badge} earned={earned}/>;
  if (cat === 'pillar')    return <PillarBadge    badge={badge} earned={earned}/>;
  if (cat === 'special')   return <SpecialBadge   badge={badge} earned={earned}/>;
  return null;
}

Object.assign(window, { TierCertificate, BadgeSVG, BadgeCertificate });
