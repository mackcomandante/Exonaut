// Share Card — downloadable + LinkedIn-postable artifacts
// -------------------------------------------------------------
// Generic modal that turns any badge / award / mission citation into:
//   1. a downloadable 1200×1200 PNG (LinkedIn square post size)
//   2. an editable caption ready for LinkedIn
//   3. a "Post to LinkedIn" flow that opens the LI share composer
//      and auto-copies the caption to clipboard for paste.

(function () {

  // ---- Canvas renderer: paints a shareable card for the artifact. ----
  // Kind: 'badge' | 'award' | 'citation'.
  function paintCard(canvas, { kind, payload }) {
    const W = 1200, H = 1200;
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');

    // Background — deep ink with subtle grid
    ctx.fillStyle = '#0C0B17';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 60) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y < H; y += 60) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    // Corner brand
    ctx.fillStyle = '#C9F24A';
    ctx.font = '700 20px "JetBrains Mono", monospace';
    ctx.fillText('EXOASIA', 60, 80);
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '500 14px "JetBrains Mono", monospace';
    ctx.fillText('EXONAUT PORTAL · ' + (COHORT?.code || 'EX-25-26'), 60, 106);

    // Stamp at top right
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.textAlign = 'right';
    ctx.font = '500 14px "JetBrains Mono", monospace';
    const stampId = payload?.code || payload?.id || 'CERT-' + Math.random().toString(36).slice(2,8).toUpperCase();
    ctx.fillText('REF · ' + stampId.toUpperCase(), W - 60, 80);
    ctx.fillText(new Date().toLocaleDateString('en-US', { year:'numeric', month:'short', day:'numeric' }).toUpperCase(), W - 60, 106);
    ctx.textAlign = 'left';

    // Accent top-left corner mark
    ctx.strokeStyle = '#C9F24A';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(40, 40); ctx.lineTo(40, 120); ctx.moveTo(40, 40); ctx.lineTo(120, 40);
    ctx.stroke();
    ctx.beginPath(); ctx.moveTo(W-40, H-40); ctx.lineTo(W-40, H-120); ctx.moveTo(W-40, H-40); ctx.lineTo(W-120, H-40);
    ctx.stroke();

    // Kicker
    ctx.fillStyle = kind === 'citation' ? '#7FE3FF' : (payload?.color || '#C9F24A');
    ctx.font = '700 18px "JetBrains Mono", monospace';
    const kicker = {
      badge:    'BADGE · EARNED',
      award:    'AWARD · CONFERRED',
      citation: 'CITATION · MISSION APPROVED',
    }[kind] || 'ARTIFACT';
    ctx.fillText(kicker, 60, 200);

    // Center medallion area — draw emblem
    const cx = W/2, cy = 520;
    const color = payload?.color || '#C9F24A';
    // Outer ring
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.3;
    ctx.beginPath(); ctx.arc(cx, cy, 240, 0, Math.PI*2); ctx.stroke();
    ctx.globalAlpha = 0.6;
    ctx.beginPath(); ctx.arc(cx, cy, 210, 0, Math.PI*2); ctx.stroke();
    ctx.globalAlpha = 1;

    // Gradient fill inner disc
    const grad = ctx.createRadialGradient(cx, cy-40, 20, cx, cy, 180);
    grad.addColorStop(0, color + 'ff');
    grad.addColorStop(0.55, color + '55');
    grad.addColorStop(1, color + '00');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(cx, cy, 180, 0, Math.PI*2); ctx.fill();

    // Core disc
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(cx, cy, 70, 0, Math.PI*2); ctx.fill();

    // Label on core
    ctx.fillStyle = '#0C0B17';
    ctx.font = '700 36px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    const short = (payload?.code || '').split('-')[1] || (payload?.shortLabel || 'EXO');
    ctx.fillText(short, cx, cy + 13);

    // Title
    ctx.fillStyle = '#F5F3EC';
    ctx.font = '700 64px "Space Grotesk", "Helvetica Neue", sans-serif';
    ctx.textAlign = 'center';
    const title = payload?.name || payload?.title || 'Exonaut Achievement';
    wrapText(ctx, title, cx, 860, W - 160, 72);

    // Subtitle
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.font = '500 24px "Space Grotesk", sans-serif';
    const subtitle = payload?.subtitle || payload?.sub || '';
    if (subtitle) wrapText(ctx, subtitle, cx, 960, W - 200, 32);

    // Recipient
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '500 16px "JetBrains Mono", monospace';
    ctx.fillText('CONFERRED UPON', cx, 1040);
    ctx.fillStyle = '#F5F3EC';
    ctx.font = '700 28px "Space Grotesk", sans-serif';
    ctx.fillText((payload?.recipient || ME?.name || 'Exonaut').toUpperCase(), cx, 1078);

    // Footer line
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.font = '500 13px "JetBrains Mono", monospace';
    ctx.fillText('VERIFIED · exoasia.sg/exonaut/' + (ME?.id || 'u14'), 60, H - 80);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#C9F24A';
    ctx.fillText('▲ EXOASIA FELLOWSHIP', W - 60, H - 80);
  }

  // --- simple wrapped-text helper (canvas) ---
  function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = String(text).split(/\s+/);
    let line = '', lines = [];
    for (const w of words) {
      const test = line ? line + ' ' + w : w;
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line); line = w;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    lines.slice(0, 3).forEach((l, i) => ctx.fillText(l, x, y + i * lineHeight));
  }

  // ---- Default LinkedIn caption per-kind ----
  function defaultCaption({ kind, payload }) {
    const me  = ME?.name || 'an Exonaut';
    const cohort = COHORT?.name || 'Exoasia Fellowship';
    if (kind === 'badge') {
      return `Proud to share I just earned the ${payload.name} badge in the ${cohort}. ${payload.subtitle || ''}\n\nEvery badge in the program is tied to real client work — ${cohort.includes('Exoasia') ? 'Exoasia' : 'our'} cohort ships against live briefs for 12 weeks straight. Grateful for the mentors and teammates pushing the standard every day.\n\n#ExoasiaFellowship #Exonaut #${(payload.category || 'milestone').toString().replace(/\s/g,'')}`;
    }
    if (kind === 'award') {
      return `Humbled to receive the ${payload.name} award. ${payload.subtitle || ''}\n\nBig thanks to my track lead, my pod, and every client conversation that pushed the thinking forward. More shipping ahead.\n\n#ExoasiaFellowship #${(payload.name || '').replace(/\s/g,'')}`;
    }
    if (kind === 'citation') {
      const grade = (payload.grade || 'approved').toUpperCase();
      return `Mission citation just in: "${payload.title}" — graded ${grade} (+${payload.pointsAwarded || payload.points} pts) in the ${cohort}.\n\n${payload.feedback ? '"' + payload.feedback.slice(0, 220) + (payload.feedback.length > 220 ? '…' : '') + '"\n\n' : ''}#ExoasiaFellowship #Exonaut`;
    }
    return `Sharing a milestone from the ${cohort}.`;
  }

  // ---- Main modal ----
  function ShareModal({ kind, payload, onClose }) {
    const canvasRef = React.useRef(null);
    const [caption, setCaption] = React.useState(() => defaultCaption({ kind, payload }));
    const [copyState, setCopyState] = React.useState('idle');
    const [postState, setPostState] = React.useState('idle');

    React.useEffect(() => {
      if (!canvasRef.current) return;
      paintCard(canvasRef.current, { kind, payload });
    }, [kind, payload]);

    const filename = React.useMemo(() => {
      const stem = (payload?.name || payload?.title || 'exonaut').toString()
        .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      return `${stem || 'exonaut'}-${kind}.png`;
    }, [kind, payload]);

    const handleDownload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
      });
    };

    const handleCopyCaption = async () => {
      try {
        await navigator.clipboard.writeText(caption);
        setCopyState('copied');
        setTimeout(() => setCopyState('idle'), 1800);
      } catch {
        setCopyState('err');
      }
    };

    const handlePostLinkedIn = async () => {
      // Copy caption first so the LinkedIn composer can be filled with paste.
      try { await navigator.clipboard.writeText(caption); } catch {}
      // Open LinkedIn post composer — share-offsite accepts url, but we also
      // want image upload. We open the generic share URL; the user uploads
      // the PNG they just downloaded (or downloads again from here).
      const shareUrl = 'https://www.linkedin.com/feed/?shareActive=true&text=' + encodeURIComponent(caption.slice(0, 1200));
      window.open(shareUrl, '_blank', 'noopener,noreferrer');
      setPostState('opened');
      setTimeout(() => setPostState('idle'), 3200);
    };

    const kicker = {
      badge:    { label: 'SHARE BADGE',    icon: 'fa-medal' },
      award:    { label: 'SHARE AWARD',    icon: 'fa-trophy' },
      citation: { label: 'SHARE CITATION', icon: 'fa-stamp' },
    }[kind] || { label: 'SHARE', icon: 'fa-share-nodes' };

    return (
      <div className="share-overlay" onClick={onClose}>
        <div className="share-modal" onClick={e => e.stopPropagation()}>
          <div className="share-head">
            <span className="t-mono" style={{ fontSize: 10, letterSpacing: '0.14em', color: 'var(--lime)' }}>
              <i className={'fa-solid ' + kicker.icon} style={{ marginRight: 6 }} />
              {kicker.label}
            </span>
            <button className="share-close" onClick={onClose} title="Close">
              <i className="fa-solid fa-xmark" />
            </button>
          </div>

          <div className="share-body">
            {/* Preview card */}
            <div className="share-preview">
              <canvas ref={canvasRef} className="share-canvas" />
              <div className="t-mono" style={{ fontSize: 9, letterSpacing: '0.1em', color: 'var(--off-white-40)', marginTop: 10, textAlign: 'center' }}>
                1200 × 1200 · PNG · LINKEDIN-READY
              </div>
            </div>

            {/* Caption + controls */}
            <div className="share-controls">
              <div>
                <div className="t-label-muted" style={{ marginBottom: 6 }}>CAPTION</div>
                <textarea
                  className="input share-caption"
                  value={caption}
                  onChange={e => setCaption(e.target.value)}
                  rows={10}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                  <span className="t-mono" style={{ fontSize: 10, color: 'var(--off-white-40)' }}>
                    {caption.length} / 3000 CHARS
                  </span>
                  <button className="btn btn-ghost btn-sm" onClick={handleCopyCaption}>
                    <i className={'fa-solid ' + (copyState === 'copied' ? 'fa-check' : 'fa-copy')} />
                    &nbsp;{copyState === 'copied' ? 'COPIED' : 'COPY CAPTION'}
                  </button>
                </div>
              </div>

              <div className="share-actions">
                <button className="btn btn-ghost" onClick={handleDownload}>
                  <i className="fa-solid fa-download" /> DOWNLOAD PNG
                </button>
                <button className="btn btn-primary share-li" onClick={handlePostLinkedIn}>
                  <i className="fa-brands fa-linkedin" />
                  {postState === 'opened' ? 'LINKEDIN OPENED — PASTE & POST' : 'POST TO LINKEDIN'}
                </button>
                <div className="t-mono" style={{ fontSize: 9, color: 'var(--off-white-40)', letterSpacing: '0.08em', lineHeight: 1.5 }}>
                  Clicking <strong>POST TO LINKEDIN</strong> copies the caption to your
                  clipboard and opens LinkedIn's composer — upload the downloaded
                  PNG and paste the caption to finalize.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---- Tiny inline trigger button — reuse across screens. ----
  function ShareButton({ kind, payload, label = 'SHARE', variant = 'ghost', size = 'sm', icon = 'fa-share-nodes' }) {
    const [open, setOpen] = React.useState(false);
    return (
      <>
        <button
          className={'btn btn-' + variant + ' btn-' + size}
          onClick={(e) => { e.stopPropagation(); setOpen(true); }}
          title="Download or post to LinkedIn"
        >
          <i className={'fa-solid ' + icon} /> {label}
        </button>
        {open && <ShareModal kind={kind} payload={payload} onClose={() => setOpen(false)} />}
      </>
    );
  }

  Object.assign(window, { ShareModal, ShareButton });
})();
